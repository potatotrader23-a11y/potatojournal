update public.backtests
set variables =
  (
    variables
      - 'structureBreakTiming'
      - 'entryHalf'
      - 'asianPosition'
      - 'insideHigherHighOrLow'
      - 'structureBreakDuringTrade'
      - 'tradeWithinTradingHours'
  ) || jsonb_build_object(
    'entryTime',
    case
      when coalesce(variables ->> 'entryTime', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        then variables ->> 'entryTime'
      else '15:00'
    end,
    'setupType',
    case
      when variables ->> 'setupType' in ('continuation', 'breakout', 'reversal')
        then variables ->> 'setupType'
      else 'continuation'
    end
  );
