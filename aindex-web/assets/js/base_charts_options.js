import _ from 'lodash';

export const pieChartOptions = {
    responsive: true,
    plugins: {
        legend: {
            display: false,
        }
    }
}

export const stackedBarChartOptions = {
    responsive: true,
    plugins: {
        htmlLegend: false,
    },
    scales: {
        x: {stacked: true},
        y: {stacked: true}
    }
}

export const barChartOptions = {
    responsive: true,
    plugins: {
        htmlLegend: false,
    }
}

export const lineChartOptions = {
    responsive: true,
    plugins: {
        htmlLegend: false,
    }
}

export const horizontalBarChartOptions = _.merge({}, barChartOptions, {
    indexAxis: 'y'
});
