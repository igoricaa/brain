import _ from 'lodash';

const defaultPieChartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false,
        }
    }
}

const defaultStackedBarChartOptions = {
    responsive: true,
    plugins: {
        htmlLegend: false,
    },
    scales: {
        x: {stacked: true},
        y: {stacked: true}
    }
}

const defaultBarChartOptions = {
    responsive: true,
    plugins: {
        htmlLegend: false,
    }
}

const defaultLineChartOptions = {
    responsive: true,
    plugins: {
        htmlLegend: false,
    }
}

const defaultHorizontalBarChartOptions = _.merge({}, defaultBarChartOptions, {
    indexAxis: 'y'
});

const hqCountryCompanyCount = _.merge({}, defaultPieChartOptions, {
    plugins: {
        htmlLegend: {
            containerID: 'hq-country-company-count-legend'
        }
    }
});

const hqStateCompanyCount = _.merge({}, defaultPieChartOptions, {
    plugins: {
        htmlLegend: {
            containerID: 'hq-state-company-count-legend'
        }
    }
});

const hqCityCompanyCount = _.merge({}, defaultPieChartOptions, {
    plugins: {
        htmlLegend: {
            containerID: 'hq-city-company-count-legend'
        }
    }
});

const techTypeCompanyCountTrend = _.cloneDeep(defaultStackedBarChartOptions);
const industriesCompanyCountTrend = _.cloneDeep(defaultBarChartOptions);
const yearFoundedCompanyCountTrend = _.cloneDeep(defaultBarChartOptions);
const foundersCountCompanyCountTrend = _.cloneDeep(defaultStackedBarChartOptions);
const foundersPastEmploymentCompanyCountTrend = _.cloneDeep(defaultStackedBarChartOptions);
const foundersMogBgCountTrend = _.cloneDeep(defaultBarChartOptions);
const foundersDiversityCountTrend = _.cloneDeep(defaultLineChartOptions);

const foundersBachelorSchoolCount = _.merge({}, defaultHorizontalBarChartOptions, {
    plugins: {
        legend: {
            display: false
        }
    }
});

const foundersGraduateSchoolCount = _.merge({}, defaultHorizontalBarChartOptions, {
    plugins: {
        legend: {
            display: false
        }
    }
});

const foundersGraduateDegreeTypeCount = _.merge({}, defaultPieChartOptions, {
    plugins: {
        htmlLegend: {
            containerID: 'founders-graduate-degree-type-count-legend'
        }
    }
});

const investorsCompanyCountTrend = _.cloneDeep(defaultHorizontalBarChartOptions);
const acceleratorsCompanyCountTrend = _.cloneDeep(defaultHorizontalBarChartOptions);

export const chartsOptions = {
    hqCountryCompanyCount,
    hqStateCompanyCount,
    hqCityCompanyCount,
    techTypeCompanyCountTrend,
    industriesCompanyCountTrend,
    yearFoundedCompanyCountTrend,
    foundersCountCompanyCountTrend,
    foundersPastEmploymentCompanyCountTrend,
    foundersMogBgCountTrend,
    foundersDiversityCountTrend,
    foundersBachelorSchoolCount,
    foundersGraduateSchoolCount,
    foundersGraduateDegreeTypeCount,
    investorsCompanyCountTrend,
    acceleratorsCompanyCountTrend
}
