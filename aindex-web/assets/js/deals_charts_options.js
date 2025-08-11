import _ from 'lodash';

import * as baseChartsOptions from './base_charts_options';


export const dateCountTrend = _.merge({}, baseChartsOptions.lineChartOptions, {
    scales: {
        x: {
            type: 'time',
            time: {
                unit: 'day'
            }
        }
    }
});


export const fundingStageCount = _.merge({}, baseChartsOptions.pieChartOptions, {
    plugins: {
        htmlLegend: {
            containerID: 'funding-stage-count-chart-legend'
        }
    }
});


export const industryCount = _.cloneDeep(baseChartsOptions.barChartOptions);


export const duSignalCount = _.merge({}, baseChartsOptions.pieChartOptions, {
    plugins: {
        htmlLegend: {
            containerID: 'du-signal-count-chart-legend'
        }
    }
});
