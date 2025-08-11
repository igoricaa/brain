import * as bootstrap from 'bootstrap';
import * as $ from 'jquery';
import * as select2 from 'select2';

window.onload = (event) => {
    const toastElList = document.querySelectorAll('.toast.site-message')
    const toastList = [...toastElList].map(toastEl => {
        new bootstrap.Toast(toastEl, {
            animation: true,
            autohide: true,
            delay: 7500
        }).show()
    })
}

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
