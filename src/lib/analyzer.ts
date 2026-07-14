import { calculateMean, calculateVariance, calculateSD, calculateCorrelation } from './statistics';

export const analyzeData = (rawData: any[], examType: string, kkm: number) => {
    const keys = Object.keys(rawData[0]);
    const ignoreCols = ['no', 'no.', 'nama', 'nama siswa', 'nis', 'nisn', 'kelas', 'l/p', 'total', 'skor', 'nilai', 'rank', 'keterangan'];
    
    const questionCols = keys.filter(k => {
        const lowerK = String(k).toLowerCase().trim();
        if (ignoreCols.some(ig => lowerK === ig || lowerK === ig+'.' || lowerK.includes(ig))) return false;
        return /\d/.test(lowerK);
    });

    if (questionCols.length === 0) { 
        throw new Error(`Gagal mendeteksi kolom soal. Header terbaca: [${keys.slice(0,5).join(", ")}...]. Pastikan ada angka pada header soal.`);
    }

    let maxScores: Record<string, number> = {};
    let studentRows = [];
    let kunciJawaban: Record<string, string> = {}; 

    let nameKey = keys.find(k => /nama|siswa|peserta/i.test(String(k))) || keys[1];
    let noKey = keys.find(k => String(k).toLowerCase().trim() === 'no' || String(k).toLowerCase().trim() === 'no.');

    if (examType === 'uraian') {
        const maxRowIndex = rawData.findIndex(row => {
            const nameVal = String(row[nameKey] || "").toLowerCase();
            return nameVal.includes("maksimal") || nameVal.includes("skor max") || nameVal.includes("nilai max") || nameVal === "max" || nameVal === "maks";
        });

        if (maxRowIndex !== -1) {
            const maxRow = rawData[maxRowIndex];
            questionCols.forEach(q => maxScores[q] = parseFloat(maxRow[q]) || 1);
            studentRows = rawData.filter((_, idx) => idx !== maxRowIndex);
        } else {
            questionCols.forEach(q => {
                const maxVal = Math.max(...rawData.map(row => parseFloat(row[q] || 0)));
                maxScores[q] = maxVal > 0 ? maxVal : 1;
            });
            studentRows = rawData;
        }
    } else if (examType === 'pg_huruf' || examType === 'bs') {
        const kunciRowIndex = rawData.findIndex(row => {
            const nameVal = String(row[nameKey] || "").toLowerCase();
            return nameVal.includes("kunci");
        });

        if (kunciRowIndex === -1) {
            throw new Error(`Baris "Kunci Jawaban" tidak ditemukan!`);
        }

        const kunciRow = rawData[kunciRowIndex];
        questionCols.forEach(q => {
            kunciJawaban[q] = String(kunciRow[q] || "").trim().toUpperCase(); 
            maxScores[q] = 1; 
        });
        
        studentRows = rawData.filter((_, idx) => idx !== kunciRowIndex);
    } else {
        questionCols.forEach(q => maxScores[q] = 1);
        studentRows = rawData;
    }

    studentRows = studentRows.filter(row => {
            let nameVal = String(row[nameKey] || "").trim();
            const noVal = String(noKey && row[noKey] ? row[noKey] : "").trim();
            nameVal = nameVal.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
            row[nameKey] = nameVal;

            const nameLower = nameVal.toLowerCase();
            const isRekap = nameLower.includes("rata-rata") || nameLower.includes("jumlah") || nameLower === "max" || nameLower === "min";
            if (isRekap) return false;
            return noVal !== "" || nameVal !== "";
    });

    if (studentRows.length === 0) { 
        throw new Error("Data siswa kosong setelah proses pembersihan data.");
    }

    let distractorData: Record<string, any> = {};
    if (examType === 'pg_huruf') {
        questionCols.forEach(q => { distractorData[q] = { A:0, B:0, C:0, D:0, E:0, Kosong:0 }; });
    } else if (examType === 'bs') {
        questionCols.forEach(q => { distractorData[q] = { B:0, S:0, Kosong:0 }; });
    }

    const students = studentRows.map((row, idx) => {
        let rawScore = 0;
        let totalMaxPossible = 0;
        const itemScores: Record<string, any> = {};
        
        questionCols.forEach(q => {
            let score = 0;
            if (examType === 'pg_huruf' || examType === 'bs') {
                let studentAns = String(row[q] || "").trim().toUpperCase();
                if(examType === 'pg_huruf' && (studentAns === 'A.' || studentAns === 'A)')) studentAns = 'A';
                
                const correctAnsStr = kunciJawaban[q] || "";
                const correctAnswers = correctAnsStr.split(',').map(ans => ans.trim().toUpperCase());
                
                score = (studentAns !== "" && correctAnswers.includes(studentAns)) ? 1 : 0;
                
                if (distractorData[q] && distractorData[q][studentAns] !== undefined) {
                    distractorData[q][studentAns]++;
                } else if (studentAns === "") {
                    distractorData[q]['Kosong']++;
                }
                itemScores[`${q}_ans`] = studentAns;

            } else {
                score = parseFloat(row[q] || 0);
            }
            
            itemScores[q] = score;
            rawScore += score;
            totalMaxPossible += maxScores[q];
        });
        
        const finalScore = totalMaxPossible > 0 ? (rawScore / totalMaxPossible) * 100 : 0;
        let name = row[nameKey];
        if (!name || String(name).trim() === "") name = `Siswa No. ${noKey ? row[noKey] : (idx + 1)}`;
        return { id: idx + 1, name, rawScore, finalScore: parseFloat(finalScore.toFixed(2)), itemScores, status: finalScore >= kkm ? 'Tuntas' : 'Belum Tuntas' };
    });

    students.sort((a, b) => b.rawScore - a.rawScore);
    const groupSize = Math.max(1, Math.ceil(0.27 * students.length));
    const upperGroup = students.slice(0, groupSize);
    const lowerGroup = students.slice(students.length - groupSize);

    let sumItemVars = 0;
    const itemResults = questionCols.map(q => {
        const allScores = students.map(s => s.itemScores[q]);
        const upperScores = upperGroup.map(s => s.itemScores[q]);
        const lowerScores = lowerGroup.map(s => s.itemScores[q]);
        const currentMax = maxScores[q];

        const meanVal = calculateMean(allScores);
        const pVal = currentMax > 0 ? meanVal / currentMax : 0;
        const dVal = currentMax > 0 ? (calculateMean(upperScores) - calculateMean(lowerScores)) / currentMax : 0;
        const validity = calculateCorrelation(allScores, students.map(s => s.rawScore));
        sumItemVars += calculateVariance(allScores);

        let pCat = pVal > 0.7 ? "Mudah" : (pVal < 0.3 ? "Sukar" : "Sedang");
        let dCat = dVal >= 0.4 ? "Sangat Baik" : (dVal >= 0.3 ? "Baik" : (dVal >= 0.2 ? "Cukup" : (dVal >= 0 ? "Jelek" : "Jelek (-)")));
        
        let decision = "Dipakai";
        if (dVal < 0 || validity < 0) decision = "Dibuang";
        else if (dVal < 0.2) decision = "Revisi/Buang";
        else if (pCat !== "Sedang" && dCat === "Cukup") decision = "Revisi";

        let distractorObj: any = null;
        if (examType === 'pg_huruf' || examType === 'bs') {
            const totalN = students.length;
            distractorObj = {};
            const opts = examType === 'pg_huruf' ? ['A','B','C','D','E'] : ['B','S'];
            opts.forEach(opt => {
                const count = distractorData[q][opt];
                const pct = Math.round((count / totalN) * 100);
                const isKey = kunciJawaban[q].includes(opt);
                const isEffective = !isKey && pct >= 5;
                distractorObj[opt] = { count, pct, isKey, isEffective };
            });
        }

        return { 
            id: q, p: pVal, pCat, d: dVal, dCat, validity, 
            valStatus: validity > 0.25 ? "Valid" : "Tdk Valid", 
            decision, maxScore: currentMax,
            distractorData: distractorObj,
            keyAns: (examType === 'pg_huruf' || examType === 'bs') ? kunciJawaban[q] : null
        };
    });

    const allFinalScores = students.map(s => s.finalScore);
    const classMean = calculateMean(allFinalScores);
    const classSD = calculateSD(allFinalScores);
    const classMax = Math.max(...allFinalScores);
    const classMin = Math.min(...allFinalScores);

    const cStats = {
        mean: classMean.toFixed(1),
        sd: classSD.toFixed(2),
        max: classMax,
        min: classMin
    };

    const totalScoreVar = calculateVariance(students.map(s => s.rawScore));
    const reliability = totalScoreVar > 0 ? (questionCols.length / (questionCols.length - 1)) * (1 - (sumItemVars / totalScoreVar)) : 0;

    const acceptedCount = itemResults.filter(i => i.decision === 'Dipakai').length;
    const relCat = reliability > 0.7 ? "Sangat Reliabel" : (reliability > 0.4 ? "Cukup Reliabel" : "Kurang Reliabel");
    const narrative = `Berdasarkan analisis terhadap ${students.length} peserta tes dan ${questionCols.length} butir soal, instrumen ini memiliki Reliabilitas sebesar ${reliability.toFixed(3)} (${relCat}). Rata-rata nilai kelas adalah ${cStats.mean} dengan simpangan baku ${cStats.sd}. Terdapat ${acceptedCount} soal (${Math.round(acceptedCount/questionCols.length*100)}%) yang dinyatakan VALID dan direkomendasikan untuk DIPAKAI pada bank soal. Sisanya direkomendasikan untuk direvisi atau dibuang karena memiliki daya pembeda yang rendah atau tingkat kesukaran yang tidak proporsional.`;

    return {
        summary: { studentCount: students.length, itemCount: questionCols.length, reliability: reliability.toFixed(3), relCat, accepted: acceptedCount, tuntas: students.filter(s => s.status === 'Tuntas').length, narrative },
        classStats: cStats,
        analyzedData: itemResults,
        studentData: students.sort((a,b) => a.id - b.id)
    }
};
