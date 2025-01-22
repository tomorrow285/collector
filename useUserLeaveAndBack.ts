import { useInterval, useThrottleFn } from "ahooks";
import { useCallback, useRef, useState } from "react";

export function useUserLeaveCountDown() {
  const targetTimeRef = useRef(0)
  const countdownRef = useRef(0)
  const timeoutCallbackRef = useRef<() => void>()
  const tickCallbackRef = useRef<() => void>()
  const [interval, setInterval] = useState<number | undefined>(undefined);

  const { run: updateTargetTime } = useThrottleFn(
    () => {
      targetTimeRef.current = Date.now() + countdownRef.current
    },
    { wait: 200 },
  );

  const addListeners = useCallback(() => {
    document.addEventListener('mousemove', updateTargetTime);
    document.addEventListener('mousedown', updateTargetTime);
    document.addEventListener('keydown', updateTargetTime);
    document.addEventListener('scroll', updateTargetTime);
  }, [])

  const removeListeners = useCallback(() => {
    document.removeEventListener('mousemove', updateTargetTime);
    document.removeEventListener('mousedown', updateTargetTime);
    document.removeEventListener('keydown', updateTargetTime);
    document.removeEventListener('scroll', updateTargetTime);
  }, [])

  const startCountDown = useCallback((params: {
    countdown: number;
    tickInterval: number;
    onTimeout: () => void
    onTick: () => void
  }) => {
    countdownRef.current = params.countdown;
    timeoutCallbackRef.current = params.onTimeout;
    tickCallbackRef.current = params.onTick;
    targetTimeRef.current = Date.now() + countdownRef.current
    addListeners()
    setInterval(params.tickInterval)
  }, [])

  const clearCountDown = useCallback(() => {
    targetTimeRef.current = 0
    countdownRef.current = 0
    timeoutCallbackRef.current = undefined
    tickCallbackRef.current = undefined
    targetTimeRef.current = Date.now() + countdownRef.current
    removeListeners()
    setInterval(undefined)
  }, [])

  const tick = useCallback(() => {
    if (targetTimeRef.current <= Date.now()) {
      timeoutCallbackRef.current?.()
      clearCountDown()
    } else {
      tickCallbackRef.current?.()
    }
  }, [])

  useInterval(() => {
    tick()
  }, interval)

  return { startCountDown, clearCountDown }
}


export function useUserLeaveAndBack() {
  const { startCountDown, clearCountDown } = useUserLeaveCountDown()
  const stopRef = useRef<() => void>()
  const subscribe = useCallback((params: {
    // 不活跃倒计时，用户一段时间没有触发任何事件，认为用户离开
    activeCountdown: number;
    // 检测间隔，在用户离开前，每间隔一段时间会检查用户的活跃状态
    activeCheckTickInterval: number;
    // 每次检测时，如果用户还处于活跃状态，则触发这个回调
    onTick: () => void
    // 用户离开的回调
    onUserLeave: () => void
    // 用户重新活跃的回调
    onUserBack: () => void
  }) => {
    let isLeave = false
    let isBack = false
    const { activeCountdown, activeCheckTickInterval, onTick, onUserLeave, onUserBack } = params
    const onLeave = () => {
      if (isLeave) { return }
      isLeave = true
      onUserLeave();
      clearCountDown()
    }

    const onBack = () => {
      if (!isLeave) { return }
      if (isBack) { return }
      isBack = true
      onUserBack()
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      stop();
    }

    startCountDown({
      countdown: activeCountdown,
      tickInterval: activeCheckTickInterval,
      onTimeout: onLeave,
      onTick
    })
    const onVisibilitychange = () => {
      if (document.hidden) {
        onLeave()
      } else {
        onBack()
      }
    }
    document.addEventListener("visibilitychange", onVisibilitychange);
    document.addEventListener('mousemove', onBack);
    document.addEventListener('mousedown', onBack);
    document.addEventListener('keydown', onBack);
    document.addEventListener('scroll', onBack);

    function stop() {
      isBack = true;
      isLeave = true;
      clearCountDown();
      document.removeEventListener("visibilitychange", onVisibilitychange);
      document.removeEventListener('mousemove', onBack);
      document.removeEventListener('mousedown', onBack);
      document.removeEventListener('keydown', onBack);
      document.removeEventListener('scroll', onBack);
      stopRef.current = undefined
    }

    stopRef.current = stop

    return stop
  }, [])


  return {
    subscribe,
    stopSubscribe: () => {
      stopRef.current?.()
    }
  }
}