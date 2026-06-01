
CREATE OR REPLACE FUNCTION public.fanout_temperature_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj_name text;
BEGIN
  IF abs(NEW.delta) < 3 THEN RETURN NEW; END IF;
  SELECT name INTO obj_name FROM public.objects WHERE id = NEW.object_id;
  IF obj_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, object_id, payload)
  SELECT w.user_id,
         CASE WHEN NEW.delta > 0 THEN 'temperature_up' ELSE 'temperature_down' END,
         obj_name || (CASE WHEN NEW.delta > 0 THEN ' 温度上升 +' ELSE ' 温度下降 ' END) || NEW.delta || '°C',
         NEW.reason,
         NEW.object_id,
         jsonb_build_object('delta', NEW.delta, 'after', NEW.temperature_after, 'reason', NEW.reason)
  FROM public.watchlist w
  WHERE w.object_id = NEW.object_id;

  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.fanout_temperature_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_fanout_temp_notif ON public.temperature_events;
CREATE TRIGGER trg_fanout_temp_notif
AFTER INSERT ON public.temperature_events
FOR EACH ROW EXECUTE FUNCTION public.fanout_temperature_notifications();
