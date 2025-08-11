import Autocomplete from "bootstrap5-autocomplete";
import axios from 'axios';
import * as Vue from 'vue';

import settings from './conf';


const legacySetup = async function () {
    let dealAssessmentForm = document.getElementById('deal-assessment-form');

    const recommendationInput = document.getElementById('id_quality_percentile');
    const rationaleInput = document.getElementById('id_investment_rationale');
    const prosInput = document.getElementById('id_pros');
    const consInput = document.getElementById('id_cons');
    const sendToAffinityInput = document.getElementById('id_send_to_affinity');

    const dealProcessingIndicator = document.getElementById('deal-processing-indicator');


    let sendToAffinityBtn = document.getElementById('send-to-affinity-btn');
        if (sendToAffinityBtn) {
            sendToAffinityBtn.onclick = function() {
                sendToAffinityInput.value = "1";
                recommendationInput.required = true;
                rationaleInput.required = true;
                prosInput.required = true;
                consInput.required = true;
            };
        }

    let saveAssessmentButton = document.getElementById('save-assessment-btn');
    if (saveAssessmentButton) {
        saveAssessmentButton.onclick = function() {
            sendToAffinityInput.value = "";
            recommendationInput.required = false;
            rationaleInput.required = false;
            prosInput.required = false;
            consInput.required = false;
        };
    }

    async function refreshDealProcessingStatus () {
        const response = await fetch(dealProcessingIndicator.dataset.progressUrl);
        const status = await response.json();

        if (status.ready === true) {
            location.reload(true);
        }
    }

    if (dealProcessingIndicator) {
        setInterval(() => {
            refreshDealProcessingStatus();
        }, 10000);
    }

    let dealUpdateForm = document.getElementById('deal-update-form');
    if (dealUpdateForm) {
        dealUpdateForm.onsubmit = async function(e) {

            e.preventDefault();

            if (dealAssessmentForm) {

                const dealAssessmentResponse = await fetch(dealAssessmentForm.action, {
                    method: dealAssessmentForm.method,
                    body: new FormData(dealAssessmentForm),
                });

                if (!dealAssessmentResponse.ok) {
                    console.log(`Failed to save deal assessment: ${dealAssessmentResponse.status}`);
                    const isJSON = dealAssessmentResponse.headers.get("content-type") == "application/json";
                    console.error(await (isJSON ? dealAssessmentResponse.json() : dealAssessmentResponse.text()));
                }
            }

            dealUpdateForm.submit();
        };
    }


    Autocomplete.init('#id_state', {
        server: `${settings.API_ROOT}locations/states/`,
        liveServer: true,
        queryParam: 'q',
        serverDataKey: 'results',
        labelField: 'name',
        valueField: 'name',
        fullWidth: true,
    });


    Autocomplete.init('#id_city', {
        server: `${settings.API_ROOT}locations/cities/`,
        liveServer: true,
        queryParam: 'q',
        serverDataKey: 'results',
        labelField: 'name',
        valueField: 'name',
        fullWidth: true,
        onBeforeFetch: (instance) => {
            const stateName = document.getElementById('id_state').value;

            if (stateName) {
                try {
                    let cfg = instance.getConfig('serverParams');
                    cfg.state_name = stateName;
                    instance.setConfig('serverParams', cfg);
                } catch (error) {
                    console.log(error);
                }
            }
        },
    });
}

const DealDetailApp = {

    data () {
        return {
            selectedPatentApplications: [],
        }
    },

    methods: {
        deleteSelectedPatentApplications: async function () {
            let form = document.getElementById('_pa-bulk-delete-form');
            form.submit();
        },
    },

    mounted () {
        legacySetup();
    }
}

const app = Vue.createApp(DealDetailApp);
app.mount('#_deal-detail');
