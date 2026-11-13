CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE FUNCTION public.create_user_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_user_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_firstlook_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
INSERT INTO public.profiles (id, display_name) SELECT id, COALESCE(raw_user_meta_data->>'display_name', '') FROM auth.users ON CONFLICT (id) DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wounds, public.checks TO authenticated;
GRANT ALL ON public.wounds, public.checks TO service_role;
REVOKE ALL ON public.wounds, public.checks, public.profiles FROM anon;
CREATE POLICY "checks require owned wound and photo" ON public.checks AS RESTRICTIVE FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.wounds w WHERE w.id = wound_id AND w.user_id = auth.uid())
  AND (photo_path IS NULL OR photo_path IN ('/demo/day1.jpg', '/demo/day3.jpg') OR split_part(photo_path, '/', 1) = auth.uid()::text)
);
CREATE POLICY "own photos update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);