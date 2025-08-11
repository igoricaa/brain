import * as Vue from 'vue';
import axios from 'axios';
import { Bar, Pie } from 'vue-chartjs'
import {
    Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, TimeScale,
    LinearScale, PointElement, LineElement, ArcElement, LineController, Colors
 } from 'chart.js';
 import 'chartjs-adapter-dayjs-4';
import _ from 'lodash';

import * as utils from './utils'
import { htmlLegend, colorPallets } from './du_charts';
import * as chartsOptions from './deals_charts_options';
import * as chartData from './du_charts_data';
import settings from './conf';


ChartJS.register(Title, Tooltip, Legend, Colors, BarElement, LineElement, PointElement,
                 CategoryScale, LinearScale, ArcElement, htmlLegend, LineController, TimeScale);


const Dashboard = {
    components: {
        Bar,
        Pie,
    },

    data () {
        return {
            lookup: {},
            results: {},
            charts: {},

            qualityPercentileChoices: {
                'top 1%': 'most interesting',
                'top 5%': 'very interesting',
                'top 10%': 'interesting',
                'top 20%': 'potentially interesting',
                'top 50%': 'not interesting',
                '': 'not assessed'
            }
        }
    },

    methods: {

        getData () {
            let request = axios.get(settings.DEALS_DASHBOARD_DATA_URL, {params: this.lookup});
            return request
        },

        updateData: async function () {
            try {
                const results = await this.getData();

                // re-order quality percentiles according to predefined choices
                results.data.quality_percentile_count = _.sortBy(results.data.quality_percentile_count, (quality) => {
                    return _.indexOf(Object.keys(this.qualityPercentileChoices), quality.score);
                });

                this.results = results.data;
            } catch (e) {
                console.log(e)
            }
        },

        updateLookup () {
            let urlParams = new URLSearchParams(window.location.search);
            // this.lookup.year_evaluated = urlParams.get('year_evaluated') || '';
        },

        updateURLParams () {
            let url = new URL(window.location);
            for (const param in this.lookup) {
                url.searchParams.set(param, this.lookup[param]);
            }
            window.history.pushState({}, '', url);
        },

        updateCharts: async function () {

            // Trend
            const dateCountTrend = {
                labels: this.results.date_count_trend.map(row => row.date),
                datasets: [
                    {
                        label: 'Daily Received Deals',
                        data: this.results.date_count_trend.map(row => row.count),
                        backgroundColor: colorPallets.default.backgroundColor[0],
                        borderColor: colorPallets.default.backgroundColor[0],
                        pointRadius: 1
                    },
                ]
            };

            this.charts.dateCountTrend = {
                data: dateCountTrend,
                options: chartsOptions.dateCountTrend
            };

            // TODO: Further investigation is needed.
            // For some unknown reason 'Line' component from vue-chartjs doesn't work.
            // Therefore chartjs had to be used directly.
            const dateCountTrendID = 'date-count-trend-chart';
            const ctx = document.getElementById(dateCountTrendID);
            try {
                ChartJS.getChart(dateCountTrendID).destroy();;
            } catch (e) {
                // chart didn't exist yet
            }
            new ChartJS(ctx, {
                type: 'line',
                ...this.charts.dateCountTrend
            });

            // Funding Stage

            const fundingStageCount = {
                labels: this.results.funding_stage_count.map(row => row.stage),
                datasets: [{
                    label: 'Number of deals',
                    data: this.results.funding_stage_count.map(row => row.count),
                    ...colorPallets.default,
                }]
            }

            this.charts.fundingStageCount = {
                data: fundingStageCount,
                options: chartsOptions.fundingStageCount
            };

            // Industries
            const industryCount = {
                labels: this.results.industry_count.map(row => row.industry_name),
                datasets: [
                    {
                        label: 'Number of deals',
                        data: this.results.industry_count.map(row => row.count),
                        backgroundColor: colorPallets.default.backgroundColor[0]
                    },
                ]
            };

            this.charts.industryCount = {
                data: industryCount,
                options: chartsOptions.industryCount
            };

            // Dual use signals

            const duSignalCount = {
                labels: this.results.du_signal_count.map(row => row.signal_name || 'none'),
                datasets: [{
                    label: 'Number of deals',
                    data: this.results.du_signal_count.map(row => row.count),
                    ...colorPallets.default,
                }]
            }

            this.charts.duSignalCount = {
                data: duSignalCount,
                options: chartsOptions.duSignalCount
            };
        },

        update: async function () {
            try {
                await this.updateData();
                this.updateCharts();
                this.updateURLParams();
            } catch (e) {
                console.log(e)
            }
        },

        asPercent: utils.asPercent,
        humanizeBool: utils.humanizeBool

   },

    mounted () {
        this.updateLookup();
        this.update();
    }
}

const app = Vue.createApp(Dashboard);
app.mount('#_deals-dashboard');
