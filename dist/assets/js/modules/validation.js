export function validateRUT(rut) {
    if (!rut) return false;
    let value = rut.replace(/\./g, '').replace(/-/g, '');
    if (value.length < 8) return false;

    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();

    let suma = 0;
    let multiplo = 2;

    for (let i = 1; i <= cuerpo.length; i++) {
        suma = suma + multiplo * value.charAt(cuerpo.length - i);
        if (multiplo < 7) multiplo = multiplo + 1; else multiplo = 2;
    }

    let dvEsperado = 11 - (suma % 11);
    dvEsperado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();

    return dv === dvEsperado;
}
