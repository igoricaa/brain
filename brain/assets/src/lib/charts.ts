import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';

// Register common components once
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Tooltip,
    Legend,
);

export const colorPalette = [
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
    'rgba(38, 152, 189, 1.0)',
    'rgba(97, 194, 203, 1.0)',
    'rgba(203, 54, 76, 1.0)',
    'rgba(55, 55, 55, 1.0)',
];

export const simpleLineOptions: import('chart.js').ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { display: false } },
};

export const simpleBarOptions: import('chart.js').ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
};

export const simplePieOptions: import('chart.js').ChartOptions<'pie'> = {
    responsive: true,
    plugins: { legend: { display: false } },
};
