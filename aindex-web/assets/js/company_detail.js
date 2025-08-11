import * as Vue from 'vue';


const CompanyDetailApp = {

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

    mounted () {}
}

const app = Vue.createApp(CompanyDetailApp);
app.mount('#_company-detail');
