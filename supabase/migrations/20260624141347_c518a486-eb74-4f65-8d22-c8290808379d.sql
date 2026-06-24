-- 1. temperature_events.actor_id 列权限收紧
REVOKE SELECT (actor_id) ON public.temperature_events FROM anon, authenticated;

-- 2. 公共 profile 视图（仅安全字段），使用 security_invoker 以遵循底层 RLS
--    并新增一条针对 authenticated 的列级 SELECT 策略放行非敏感字段
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  display_name,
  avatar_url,
  level,
  level_title,
  contribution_points,
  reputation,
  created_at
FROM public.profiles;

-- 撤销/重授列级权限：anon/authenticated 只能读公共字段，敏感列仅 owner via 策略
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, level, level_title, contribution_points, reputation, created_at)
  ON public.profiles TO anon, authenticated;
-- owner 仍可通过 service_role 与 SECURITY DEFINER 函数读取自己的完整资料
GRANT SELECT ON public.profiles TO service_role;

-- 新增一条允许 authenticated 跨用户读取（仅限上面列级授权的列）的策略
DROP POLICY IF EXISTS "public profile fields readable" ON public.profiles;
CREATE POLICY "public profile fields readable"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- owner 读取自己的完整资料（包括 email/invite_code）通过 SECURITY DEFINER 函数
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 3. SECURITY DEFINER 函数：撤销 anon 执行权限
REVOKE EXECUTE ON FUNCTION public.bind_inviter(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bind_inviter(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;