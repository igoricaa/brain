import * as Vue from 'vue';
import axios from 'axios';
import { Bar, Pie } from 'vue-chartjs'
import {
    Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale,
    LinearScale, PointElement, LineElement, ArcElement, LineController, Colors
 } from 'chart.js'
import _ from 'lodash';

import { htmlLegend, colorPallets } from './du_charts';
import { chartsOptions } from './du_charts_options';
import * as chartData from './du_charts_data';
import settings from './conf';


ChartJS.register(Title, Tooltip, Legend, Colors, BarElement, LineElement, PointElement,
                 CategoryScale, LinearScale, ArcElement, htmlLegend, LineController);


const Dashboard = {
    components: {
        Bar,
        Pie,
    },

    data () {
        return {
            lookup: {},
            report: '',
            charts: {},
        }
    },

    methods: {
        getReport () {
            let request = axios.get(settings.DU_REPORT_DATA_URL, {params: this.lookup});
            return request
        },

        updateData: async function () {
            try {
                const report = await this.getReport();
                this.report = report.data;
            } catch (e) {
                console.log(e)
            }
        },

        updateLookup () {
            let urlParams = new URLSearchParams(window.location.search);
            this.lookup.year_evaluated = urlParams.get('year_evaluated') || '';
            this.lookup.industries = urlParams.get('industries') || '';
            this.lookup.hq_country = urlParams.get('hq_country') || '';
            this.lookup.thesis_fit = urlParams.get('thesis_fit') || '';
        },

        updateURLParams () {
            let url = new URL(window.location);
            for (const param in this.lookup) {
                url.searchParams.set(param, this.lookup[param]);
            }
            window.history.pushState({}, '', url);
        },

        updateCharts: async function () {

            // Companies per HQ country
            const hqCountryCompanyCount = {
                labels: this.report.hq_country_report_count.map(row => row.hq_country_name),
                datasets: [{
                    label: 'Number of companies per HQ country',
                    data: this.report.hq_country_report_count.map(row => row.count),
                    ...colorPallets.default,
                }]
            }

            this.charts.hqCountryCompanyCount = {
                data: hqCountryCompanyCount,
                options: chartsOptions.hqCountryCompanyCount
            };

            // Companies per HQ city
            const hqCityCompanyCount = {
                labels: this.report.hq_city_report_count.map(row => row.hq_city_name),
                datasets: [{
                    label: 'Number of companies per HQ city',
                    data: this.report.hq_city_report_count.map(row => row.count),
                    ...colorPallets.default,
                }]
            }

            // show top 20
            hqCityCompanyCount.labels = [...hqCityCompanyCount.labels.slice(0, 20), 'Other'];
            hqCityCompanyCount.datasets[0].data = [
                ...hqCityCompanyCount.datasets[0].data.slice(0, 20),
                _.sum(hqCityCompanyCount.datasets[0].data.slice(20))
            ];

            this.charts.hqCityCompanyCount = {
                data: hqCityCompanyCount,
                options: chartsOptions.hqCityCompanyCount
            };

            // Companies per HQ state
            const hqStateCompanyCount = {
                labels: this.report.hq_state_report_count.map(row => row.hq_state_name),
                datasets: [{
                    label: 'Number of companies per HQ state',
                    data: this.report.hq_state_report_count.map(row => row.count),
                    ...colorPallets.default,
                }]
            }

            // show top 20
            hqStateCompanyCount.labels = [...hqStateCompanyCount.labels.slice(0, 20), 'Other'];
            hqStateCompanyCount.datasets[0].data = [
                ...hqStateCompanyCount.datasets[0].data.slice(0, 20),
                _.sum(hqStateCompanyCount.datasets[0].data.slice(20))
            ];

            this.charts.hqStateCompanyCount = {
                data: hqStateCompanyCount,
                options: chartsOptions.hqStateCompanyCount
            };

            // Technology type
            const techTypeCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.technology_type_report_count_trend,
                'year_evaluated', // groupBy
                'technology_type__name', // keyBy
                'count' // valueBy
            )

            this.charts.techTypeCompanyCountTrend = {
                data: techTypeCompanyCountTrend,
                options: chartsOptions.techTypeCompanyCountTrend
            };

            // Industries
            const industriesCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.industry_report_count_trend,
                'industries__name', // groupBy
                'year_evaluated', // keyBy
                'count', // valueBy
                colorPallets.default,
                {topN: 20} // kwargs
            )

            this.charts.industriesCompanyCountTrend = {
                data: industriesCompanyCountTrend,
                options: chartsOptions.industriesCompanyCountTrend
            };

            // year founded
            const yearFoundedCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.year_founded_report_count_trend,
                'year_founded', // groupBy
                'year_evaluated', // keyBy
                'count' // valueBy
            );

            this.charts.yearFoundedCompanyCountTrend = {
                data: yearFoundedCompanyCountTrend,
                options: chartsOptions.yearFoundedCompanyCountTrend
            };

            // Number of founders
            const foundersCountCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.founders_count_report_count_trend,
                'founders_count', // groupBy
                'year_evaluated', // keyBy
                'count', // valueBy
                colorPallets.default,
                {topN: 10} // kwargs
            );

            this.charts.foundersCountCompanyCountTrend = {
                data: foundersCountCompanyCountTrend,
                options: chartsOptions.foundersCountCompanyCountTrend
            };

            // Founders previous employers
            const foundersPastEmploymentCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.founders_past_employment_count_trend,
                'employment', // groupBy
                'year_evaluated', // keyBy
                'count' // valueBy
            );

            this.charts.foundersPastEmploymentCompanyCountTrend = {
                data: foundersPastEmploymentCompanyCountTrend,
                options: chartsOptions.foundersPastEmploymentCompanyCountTrend
            };

            // Founders military or government experience
            const foundersMogBgCountTrend = chartData.prepMultiGroupChartData(
                this.report.founders_mog_bg_count_trend,
                'employment', // groupBy
                'year_evaluated', // keyBy
                'count' // valueBy
            );

            this.charts.foundersMogBgCountTrend = {
                data: foundersMogBgCountTrend,
                options: chartsOptions.foundersMogBgCountTrend
            };

            // Diversity
            const foundersDiversityCountTrend = {
                labels: this.report.founders_diversity_report_count_trend.map(row => row.year_evaluated),
                datasets: [
                    {
                        label: 'Overall diversity',
                        data: this.report.founders_diversity_report_count_trend.map(row => row.has_diversity_on_founders),
                        backgroundColor: colorPallets.default.backgroundColor[0],
                    }, {
                        label: 'Women',
                        data: this.report.founders_diversity_report_count_trend.map(row => row.has_women_on_founders),
                        backgroundColor: colorPallets.default.backgroundColor[1],
                    }, {
                        label: 'Latinx',
                        data: this.report.founders_diversity_report_count_trend.map(row => row.has_hispanic_on_founders),
                        backgroundColor: colorPallets.default.backgroundColor[2],
                    }, {
                        label: 'Black',
                        data: this.report.founders_diversity_report_count_trend.map(row => row.has_black_on_founders),
                        backgroundColor: colorPallets.default.backgroundColor[3],
                    }, {
                        label: 'Asian',
                        data: this.report.founders_diversity_report_count_trend.map(row => row.has_asian_on_founders),
                        backgroundColor: colorPallets.default.backgroundColor[4],
                    }, {
                        label: 'Middle Eastern',
                        data: this.report.founders_diversity_report_count_trend.map(row => row.has_meo_on_founders),
                        backgroundColor: colorPallets.default.backgroundColor[5],
                    }
                ]
            };

            this.charts.foundersDiversityCountTrend = {
                data: foundersDiversityCountTrend,
                options: chartsOptions.foundersDiversityCountTrend
            };

            // TODO: Further investigation is needed.
            // For some unknown reason 'Line' component from vue-chartjs doesn't work.
            // Therefore chartjs had to be used directly.
            const foundersDiversityCountTrendID = 'founders-diversity-count-trend';
            const ctx = document.getElementById(foundersDiversityCountTrendID);
            try {
                ChartJS.getChart(foundersDiversityCountTrendID).destroy();;
            } catch (e) {
                // chart didn't exist yet
            }
            new ChartJS(ctx, {
                type: 'line',
                ...this.charts.foundersDiversityCountTrend
            });

            // Founders undergraduate schools
            const foundersBachelorSchoolCount = chartData.prepSimpleChartData(
                this.report.founders_bachelor_school_count,
                'bachelor_school', // keyBy
                'count' // valueBy
            );

            this.charts.foundersBachelorSchoolCount = {
                data: foundersBachelorSchoolCount,
                options: chartsOptions.foundersBachelorSchoolCount
            };

            // Founder graduate schools
            const foundersGraduateSchoolCount = chartData.prepSimpleChartData(
                this.report.founders_graduate_school_count,
                'graduate_school', // keyBy
                'count' // valueBy
            );

            this.charts.foundersGraduateSchoolCount = {
                data: foundersGraduateSchoolCount,
                options: chartsOptions.foundersGraduateSchoolCount
            };

            // Founders graduate degree type
            const foundersGraduateDegreeTypeCount = chartData.prepMultiColorChartData(
                this.report.founders_graduate_degree_type_count,
                'graduate_degree_type', // keyBy
                'count', // valueBy
                'Number of founders', // label
                colorPallets.default, // colorPallet
                {emptyLabel: 'No Graduate Education'} // kwargs
            );

            this.charts.foundersGraduateDegreeTypeCount = {
                data: foundersGraduateDegreeTypeCount,
                options: chartsOptions.foundersGraduateDegreeTypeCount
            };

            // Investors
            const investorsCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.investors_report_count_trend,
                'investor_name', // groupBy
                'year_evaluated', // keyBy
                'count', // valueBy
                // colorPallets.default,
                // {topN: 20, hideOther: true} // kwargs
            );

            this.charts.investorsCompanyCountTrend = {
                data: investorsCompanyCountTrend,
                options: chartsOptions.investorsCompanyCountTrend
            };

            // Accelerators
            const acceleratorsCompanyCountTrend = chartData.prepMultiGroupChartData(
                this.report.accelerators_report_count_trend,
                'accelerator_name', // groupBy
                'year_evaluated', // keyBy
                'count' // valueBy
            );

            this.charts.acceleratorsCompanyCountTrend = {
                data: acceleratorsCompanyCountTrend,
                options: chartsOptions.acceleratorsCompanyCountTrend
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
        }
   },

    mounted () {
        this.updateLookup();
        this.update();
    }
}

const app = Vue.createApp(Dashboard);
app.mount('#_du-dashboard');
