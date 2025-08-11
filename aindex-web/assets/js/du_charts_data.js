import { colorPallets } from './du_charts';
import { circularGetItem } from './utils';


export const prepSimpleChartData = (rawData, keyBy, valueBy, label, colorPallet=colorPallets.default, kwargs={}) => {

    let labels = rawData.map(item => item[keyBy]);
    if (kwargs.emptyLabel) {
        labels = rawData.map(item => item[keyBy] || kwargs.emptyLabel);
    }

    const chartData = {
        labels: labels,
        datasets: [{
            data: rawData.map(item => item[valueBy] || 0),
            backgroundColor: colorPallet.backgroundColor[0],
            label: label
        }]
    }

    if (kwargs.topN && chartData.labels.length > kwargs.topN) {
        chartData.labels = [...chartData.labels.slice(0, kwargs.topN), 'Other'];
        chartData.datasets[0].data = [
            ...chartData.datasets[0].data.slice(0, kwargs.topN),
            _.sum(chartData.datasets[0].data.slice(kwargs.topN))
        ];
    }

    return chartData
}

export const prepMultiColorChartData = (rawData, keyBy, valueBy, label, colorPallet=colorPallets.default, kwargs={}) => {

    let labels = rawData.map(item => item[keyBy]);
    if (kwargs.emptyLabel) {
        labels = rawData.map(item => item[keyBy] || kwargs.emptyLabel);
    }

    const chartData = {
        labels: labels,
        datasets: [{
            data: rawData.map(item => item[valueBy] || 0),
            backgroundColor: colorPallet.backgroundColor,
            label: label
        }]
    };

    return chartData;
}


export const prepMultiGroupChartData = (rawData, groupBy, keyBy, valueBy, colorPallet=colorPallets.default, kwargs={}) => {

    // regroup data
    const groupedData = _.chain(rawData)
        .groupBy((item) => item[groupBy])
        .transform(
            (result, _values, _key) => {
                result.push({
                    [groupBy]: _key,
                    [valueBy]: _.chain(_values).keyBy(keyBy).mapValues(valueBy).value()
                });
                return result
            },
            []
        )
        .value()

    // get available categories
    const categories = [...new Set(rawData.map(item => item[keyBy]))];

    // chart data
    const chartData = {
        labels: groupedData.map(item => item[groupBy]),
        datasets: []
    }
    if (kwargs.topN && chartData.labels.length > kwargs.topN) {
        chartData.labels = chartData.labels.slice(0, kwargs.topN);

        if (!kwargs.hideOther) {
            chartData.labels.push('Other');
        }
    }

    // build chart datasets
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i]
        let dataset = {
            label: category,
            data: groupedData.map(item => item[valueBy][category] || 0),
            backgroundColor: circularGetItem(colorPallet.backgroundColor, i)
        }

        if (kwargs.topN && chartData.labels.length > kwargs.topN) {
            dataset.data = dataset.data.slice(0, kwargs.topN);

            if (!kwargs.hideOther) {
                dataset.data.push(_.sum(dataset.data.slice(kwargs.topN)))
            }
        }

        chartData.datasets.push(dataset)
    }

    return chartData

}
