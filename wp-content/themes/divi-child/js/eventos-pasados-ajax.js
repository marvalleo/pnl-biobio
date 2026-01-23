jQuery(document).ready(function ($) {
    $('#eventos-container').on('click', '.page, .nextpostslink', function (e) {
        e.preventDefault();

        let page = $(this).data('page');
        let postsPerPage = 3; // Número de posts por página

        // Mostrar el texto "Cargando..."
        $('#eventos-container').append('<div id="loading-text">Cargando...</div>');

        $.ajax({
            url: eventosAjax.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cargar_eventos_pasados',
                page: page,
                posts_per_page: postsPerPage,
            },
            success: function (response) {
                if (response.success) {
                    // Reemplazar el contenido con los nuevos eventos
                    $('#eventos-container').html(response.data);
                } else {
                    alert('No se pudo cargar los eventos.');
                }
            },
            error: function () {
                alert('Error al procesar la solicitud.');
            },
            complete: function () {
                // Quitar el texto "Cargando..." después de la carga
                $('#loading-text').remove();
            },
        });
    });
});
