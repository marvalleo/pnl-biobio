SELECT tablename, policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('forum_topics','forum_posts','forum_post_votes','quiz_questions','quiz_attempts')
ORDER BY tablename, cmd;
