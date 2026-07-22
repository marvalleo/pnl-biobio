-- Conteo de destinatarios para la confirmación de envío masivo (solo super_admin).
-- Se muestra en el modal de confirmación antes de enviar ("Vas a enviar a N…").
-- Coincide con la lógica de la Edge Function: 'admins' = todos los que NO son 'normal'.
-- Estado: APLICADA a producción (pnl-BD) el 2026-07-22.
CREATE OR REPLACE FUNCTION public.admin_email_recipient_count(p_audience text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE n integer;
BEGIN
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'No autorizado: se requiere super_admin';
    END IF;

    IF p_audience = 'admins' THEN
        SELECT count(*) INTO n FROM public.profiles WHERE role <> 'normal' AND email IS NOT NULL;
    ELSE
        SELECT count(*) INTO n FROM public.profiles WHERE email IS NOT NULL;
    END IF;

    RETURN COALESCE(n, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_email_recipient_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_email_recipient_count(text) TO authenticated;
