const double emgAdcFullScaleMv = 5;
const int adcMaxCount = 4095;
const int adcMidRaw = 2048;

double rawEmgToMv(int x) => (x / adcMaxCount) * emgAdcFullScaleMv;

double rawEmgToAcMv(int x) => ((x - adcMidRaw) / adcMaxCount) * emgAdcFullScaleMv;
