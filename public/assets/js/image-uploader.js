/**
 * 📤 PNL Image Uploader — carga de imágenes a Supabase Storage (bucket `multimedia`).
 *
 * Resuelve el problema de "no se puede subir desde el computador": antes solo se
 * aceptaba pegar una URL. Ahora se sube el archivo directamente al bucket público
 * `multimedia` (política existente: solo super_admin puede subir) y se obtiene la
 * URL pública automáticamente.
 *
 * API:
 *   window.PNLUploader.upload(file, folder) -> Promise<string publicUrl>
 *   window.PNLUploader.attachDropzone({ zone, input, status, folder, onUrl })
 *
 * Requiere window.supabaseClient inicializado.
 */
(function () {
    'use strict';

    var MAX_BYTES = 3 * 1024 * 1024; // 3 MB
    var OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    var BUCKET = 'multimedia';

    function sanitizeName(name) {
        var dot = name.lastIndexOf('.');
        var base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'img';
        var ext = (dot > 0 ? name.slice(dot + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        return base + '.' + ext;
    }

    async function upload(file, folder) {
        if (!file) throw new Error('No se seleccionó ninguna imagen.');
        if (!window.supabaseClient || !window.supabaseClient.storage) {
            throw new Error('Almacenamiento no disponible. Recarga la página e intenta de nuevo.');
        }
        if (OK_TYPES.indexOf((file.type || '').toLowerCase()) === -1) {
            throw new Error('Formato no permitido. Usa JPG, PNG, WEBP o GIF.');
        }
        if (file.size > MAX_BYTES) {
            throw new Error('La imagen pesa ' + (file.size / 1024 / 1024).toFixed(1) + ' MB. El máximo es 3 MB.');
        }

        var path = (folder || 'uploads') + '/' + Date.now() + '-' + sanitizeName(file.name);
        var res = await window.supabaseClient.storage.from(BUCKET).upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
        });
        if (res.error) {
            throw new Error(res.error.message || 'No se pudo subir la imagen.');
        }
        var pub = window.supabaseClient.storage.from(BUCKET).getPublicUrl(path);
        return pub.data.publicUrl;
    }

    /**
     * Conecta una zona de arrastrar-y-soltar + input de archivo.
     * opts = { zone (el|id), input (el|id), status (el|id), folder, onUrl(url) }
     */
    function attachDropzone(opts) {
        var zone = typeof opts.zone === 'string' ? document.getElementById(opts.zone) : opts.zone;
        var input = typeof opts.input === 'string' ? document.getElementById(opts.input) : opts.input;
        var status = typeof opts.status === 'string' ? document.getElementById(opts.status) : opts.status;
        var folder = opts.folder || 'uploads';
        if (!input) return;

        function setStatus(msg, color) {
            if (status) {
                status.textContent = msg || '';
                status.style.color = color || '#94a3b8';
            }
        }

        async function handleFile(file) {
            if (!file) return;
            setStatus('Subiendo imagen…', '#3b82f6');
            if (zone) zone.style.opacity = '0.6';
            try {
                var url = await upload(file, folder);
                setStatus('✓ Imagen subida', '#16a34a');
                if (opts.onUrl) opts.onUrl(url);
            } catch (err) {
                setStatus('✗ ' + (err.message || 'Error al subir'), '#ef4444');
            } finally {
                if (zone) zone.style.opacity = '1';
                if (input) input.value = '';
            }
        }

        input.addEventListener('change', function () {
            if (input.files && input.files[0]) handleFile(input.files[0]);
        });

        if (zone) {
            zone.addEventListener('click', function (e) {
                if (e.target.tagName !== 'INPUT') input.click();
            });
            ['dragenter', 'dragover'].forEach(function (ev) {
                zone.addEventListener(ev, function (e) {
                    e.preventDefault(); e.stopPropagation();
                    zone.classList.add('pnl-drag-active');
                });
            });
            ['dragleave', 'drop'].forEach(function (ev) {
                zone.addEventListener(ev, function (e) {
                    e.preventDefault(); e.stopPropagation();
                    zone.classList.remove('pnl-drag-active');
                });
            });
            zone.addEventListener('drop', function (e) {
                var dt = e.dataTransfer;
                if (dt && dt.files && dt.files[0]) handleFile(dt.files[0]);
            });
        }
    }

    window.PNLUploader = { upload: upload, attachDropzone: attachDropzone, MAX_BYTES: MAX_BYTES };
})();
