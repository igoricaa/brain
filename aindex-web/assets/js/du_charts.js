const getOrCreateLegendList = (chart, id) => {
    const legendContainer = document.getElementById(id);
    let listContainer = legendContainer.querySelector('ul');

    if (!listContainer) {
        listContainer = document.createElement('ul');
        legendContainer.appendChild(listContainer);
    }

    return listContainer;
};

// ChartJS Plugin for Custom HTML based legend
export const htmlLegend = {
    id: 'htmlLegend',
    afterUpdate(chart, args, options) {
        const ul = getOrCreateLegendList(chart, options.containerID);
        ul.classList.add('legend-items');

        // Remove old legend items
        while (ul.firstChild) {
            ul.firstChild.remove();
        }

        // Reuse the built-in legendItems generator
        const items = chart.options.plugins.legend.labels.generateLabels(chart);

        items.forEach(item => {
            const li = document.createElement('li');
            li.classList.add('legend-item');

            li.onclick = () => {
                const {type} = chart.config;
                if (type === 'pie' || type === 'doughnut') {
                    // Pie and doughnut charts only have a single dataset and visibility is per item
                    chart.toggleDataVisibility(item.index);
                } else {
                    chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
                }
                chart.update();
            };

            // Color box
            const boxSpan = document.createElement('span');
            boxSpan.classList.add('legend-item-color');
            boxSpan.style.background = item.fillStyle;
            boxSpan.style.borderColor = item.strokeStyle;
            boxSpan.style.borderWidth = item.lineWidth + 'px';

            // Text
            const textContainer = document.createElement('p');
            textContainer.classList.add('legend-item-text');
            textContainer.style.color = item.fontColor;
            textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

            const text = document.createTextNode(item.text);
            textContainer.appendChild(text);

            li.appendChild(boxSpan);
            li.appendChild(textContainer);
            ul.appendChild(li);
        });
    }
};


export const colorPallets = {
    default: {
        backgroundColor: [
            'rgba(0, 63, 92, 1.0)',
            'rgba(47, 75, 124, 1.0)',
            'rgba(102, 81, 145, 1.0)',
            'rgba(160, 81, 149, 1.0)',
            'rgba(212, 80, 135, 1.0)',
            'rgba(255, 124, 67, 1.0)',
            'rgba(255, 166, 0, 1.0)',
            'rgba(205, 81, 120, 1.0)',
            'rgba(255, 176, 91, 1.0)',
            'rgba(255, 234, 189, 1.0)',
            'rgba(124, 193, 239, 1.0)',
            'rgba(91, 91, 176, 1.0)',
            'rgba(197, 204, 223, 1.0)',
            'rgba(51, 54, 68, 1.0)',
            'rgba(93, 99, 117, 1.0)',
            'rgba(174, 176, 156, 1.0)',
            'rgba(212, 197, 170, 1.0)',
            'rgba(38,152,189, 1.0)',
            'rgba(97, 194, 203, 1.0)',
            'rgba(203, 54, 76, 1.0)',
            'rgba(55, 55, 55, 1.0)'
        ],
    }
}
