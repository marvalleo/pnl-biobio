-- ============================================================================
-- S-02 — FASE 1: Extras de seguridad (advisors) + RPCs aditivos
-- Fecha: 2026-07-22
-- Estado: APLICADA a producción (pnl-BD) el 2026-07-22.
--
-- Todo en este archivo es ADITIVO / no rompe accesos existentes.
-- La revocación de columnas que cierra la fuga de PII va en el archivo
-- 20260722_profiles_pii_column_revoke.sql y debe aplicarse DESPUÉS de
-- desplegar el frontend que usa estos RPCs.
-- ============================================================================

-- ------- 1. Advisors: fijar search_path en funciones marcadas ---------------
ALTER FUNCTION public.get_my_push_history(integer)          SET search_path = public;
ALTER FUNCTION public.cleanup_old_logs(integer)             SET search_path = public;
ALTER FUNCTION public.update_reputation_on_topic_vote()     SET search_path = public;
ALTER FUNCTION public.update_reputation_on_post_vote()      SET search_path = public;
ALTER FUNCTION public.on_quiz_passed_complete_lesson()      SET search_path = public;

-- ------- 2. Advisors: revocar EXECUTE de funciones de TRIGGER ----------------
-- Solo deben ejecutarse desde sus triggers (corren como owner), nunca como RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_update_reputation()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_update_rank_on_course()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_quiz_passed_complete_lesson()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_reputation_on_topic_vote() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_reputation_on_post_vote()  FROM PUBLIC, anon, authenticated;

-- ------- 3. RPC: perfil propio completo (self, incluye sensibles) -----------
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
    SELECT * FROM public.profiles WHERE auth_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ------- 4. RPC: listado de padrón para admin de usuarios --------------------
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_usuarios() THEN
        RAISE EXCEPTION 'No autorizado: se requiere rol de administración de usuarios';
    END IF;
    RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- ------- 5. RPC: estadísticas agregadas del dashboard (staff) ----------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE result json;
BEGIN
    IF public.get_my_role() NOT IN ('super_admin','admin_forja','admin_votos','admin_foros','admin_usuarios') THEN
        RAISE EXCEPTION 'No autorizado: se requiere rol administrativo';
    END IF;
    SELECT json_build_object(
        'users',   (SELECT count(*) FROM public.profiles),
        'courses', (SELECT count(*) FROM public.courses),
        'ballots', (SELECT count(*) FROM public.ballots)
    ) INTO result;
    RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

-- ------- 6. RPC: inscritos a un evento regional (admin forja) ----------------
CREATE OR REPLACE FUNCTION public.admin_event_registrations(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE result json;
BEGIN
    IF public.get_my_role() NOT IN ('super_admin','admin_forja') THEN
        RAISE EXCEPTION 'No autorizado: se requiere rol de administración Forja';
    END IF;
    SELECT COALESCE(json_agg(
        to_jsonb(r) || jsonb_build_object('profiles', jsonb_build_object(
            'full_name', p.full_name, 'email', p.email,
            'phone_number', p.phone_number, 'rut', p.rut
        ))
    ), '[]'::json)
    INTO result
    FROM public.regional_event_registrations r
    LEFT JOIN public.profiles p ON p.id = r.profile_id
    WHERE r.event_id = p_event_id;
    RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_event_registrations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_event_registrations(uuid) TO authenticated;

-- ------- 7. RPC: inscritos a una lección (admin forja) ----------------------
CREATE OR REPLACE FUNCTION public.admin_lesson_registrations(p_lesson_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE result json;
BEGIN
    IF public.get_my_role() NOT IN ('super_admin','admin_forja') THEN
        RAISE EXCEPTION 'No autorizado: se requiere rol de administración Forja';
    END IF;
    SELECT COALESCE(json_agg(
        to_jsonb(r) || jsonb_build_object('profiles', to_jsonb(p))
    ), '[]'::json)
    INTO result
    FROM public.lesson_registrations r
    LEFT JOIN public.profiles p ON p.id = r.profile_id
    WHERE r.lesson_id = p_lesson_id;
    RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_lesson_registrations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lesson_registrations(uuid) TO authenticated;
