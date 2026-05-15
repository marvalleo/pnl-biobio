SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('forum_topics','forum_posts')
  AND cmd = 'UPDATE';
