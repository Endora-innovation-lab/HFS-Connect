CREATE OR REPLACE FUNCTION app_private.is_principal(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = _user_id AND role = 'principal')
$$;
REVOKE ALL ON FUNCTION app_private.is_principal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.is_principal(uuid) TO authenticated, service_role;

CREATE POLICY "Principals can manage teacher_attendance" ON public.teacher_attendance
FOR ALL TO authenticated
USING (app_private.is_principal(auth.uid()) AND institute_id = app_private.get_user_institute_id(auth.uid()))
WITH CHECK (app_private.is_principal(auth.uid()) AND institute_id = app_private.get_user_institute_id(auth.uid()));