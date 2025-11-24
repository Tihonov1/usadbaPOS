document.addEventListener('DOMContentLoaded', function() {
    const queryParams = new URLSearchParams(window.location.search);
    const role = queryParams.get('role');
    if (role !== 'chef' && role !== 'admin') {
        alert('У вас нет доступа к этой странице');
        window.location.href = 'index.html';
        return;
    }
});

