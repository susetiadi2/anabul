export const calculateMean = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

export const calculateVariance = (arr: number[]) => {
    if (arr.length <= 1) return 0;
    const mean = calculateMean(arr);
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
};

export const calculateSD = (arr: number[]) => Math.sqrt(calculateVariance(arr));

export const calculateCorrelation = (x: number[], y: number[]) => {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    return denominator === 0 ? 0 : numerator / denominator;
};
