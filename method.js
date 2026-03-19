/**
 * 方法说明页面 JavaScript
 */

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNav();
});

// 导航初始化
function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }
}
