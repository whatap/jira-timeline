import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';

import { Header } from '@/3_widgets/header';
import { GoToTodayButton } from '@/4_features/go-to-today';
import { RefreshVisibleRangeButton } from '@/4_features/refresh-visible-range';
import { UserRegisterModal } from '@/4_features/user-register-modal';
import { useRefreshToken } from '@/5_entities/auth';
import { getIssues, getStatusColors, useIssueStore } from '@/5_entities/jira';
import { useClientStore } from '@/5_entities/jira/jiraClientStore';
import { useUserStore } from '@/5_entities/user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/6_shared/shadcn';
import { type DateRange, getNonOverlappingRanges, normalizeDateRange } from '@/6_shared/utils';

/**
 * debounce 유틸리티 - cancel 메서드 포함
 */
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

function MainPage() {
  const { client } = useClientStore();
  const { users } = useUserStore();
  const { refresh: refreshToken } = useRefreshToken();
  const {
    issues,
    fetchedRanges,
    addIssues,
    addFetchedRange,
    removeFetchedRange,
    incrementLoading,
    decrementLoading,
    setError,
    clear,
    isLoading,
  } = useIssueStore();

  // 현재 보이는 구간 저장 (새로고침 시 사용)
  // Timeline의 defaultTimeStart/End와 동일한 초기값 설정
  const [visibleRange, setVisibleRange] = useState<DateRange>(() => ({
    start: moment().add(-1, 'month').format('YYYY-MM-DD'),
    end: moment().add(1, 'month').format('YYYY-MM-DD'),
  }));

  // Timeline controlled mode용 타임스탬프
  const [visibleTimeStart, setVisibleTimeStart] = useState(() => moment().add(-1, 'month').valueOf());
  const [visibleTimeEnd, setVisibleTimeEnd] = useState(() => moment().add(1, 'month').valueOf());

  // 조회 중인 구간을 추적 (중복 요청 방지)
  const fetchingRanges = useRef<Set<string>>(new Set());

  // 최신 상태를 참조하기 위한 ref (debounce 재생성 방지)
  const stateRef = useRef({ fetchedRanges, client });
  useEffect(() => {
    stateRef.current = { fetchedRanges, client };
  }, [fetchedRanges, client]);

  // 구간 조회 함수
  const fetchRange = useCallback(
    async (range: DateRange) => {
      const { client } = stateRef.current;
      if (!client) return;

      const rangeKey = `${range.start}_${range.end}`;

      // 이미 조회 중이면 스킵
      if (fetchingRanges.current.has(rangeKey)) return;

      fetchingRanges.current.add(rangeKey);
      incrementLoading();
      setError(null);

      try {
        const newIssues = await getIssues(client, range);
        addIssues(newIssues);
        addFetchedRange(range);

        // API 호출 성공 시 토큰 갱신 (세션 연장)
        refreshToken();
      } catch (err) {
        const message = err instanceof Error ? err.message : '이슈 조회 중 오류가 발생했습니다.';
        setError(message);
        console.error('Failed to fetch issues:', err);
      } finally {
        fetchingRanges.current.delete(rangeKey);
        decrementLoading();
      }
    },
    [addIssues, addFetchedRange, incrementLoading, decrementLoading, setError, refreshToken],
  );

  // 필요한 구간들 조회 (ref에서 최신 상태 참조)
  const fetchRangesIfNeeded = useCallback(
    (visibleTimeStart: number, visibleTimeEnd: number) => {
      const { fetchedRanges } = stateRef.current;
      const currentRange = normalizeDateRange(visibleTimeStart, visibleTimeEnd);
      const rangesToFetch = getNonOverlappingRanges(fetchedRanges, currentRange);

      // 필요한 구간들을 병렬로 조회
      rangesToFetch.forEach((range) => {
        fetchRange(range);
      });
    },
    [fetchRange],
  );

  // debounce 적용 (ref로 관리하여 재생성 방지)
  const debouncedFetchRef = useRef<ReturnType<typeof debounce<(start: number, end: number) => void>> | null>(null);

  if (!debouncedFetchRef.current) {
    debouncedFetchRef.current = debounce((start: number, end: number) => {
      fetchRangesIfNeeded(start, end);
    }, 300);
  }

  // 컴포넌트 언마운트 시 debounce cleanup
  useEffect(() => {
    return () => {
      debouncedFetchRef.current?.cancel();
    };
  }, []);

  // 초기 로딩 (첫 진입 시)
  useEffect(() => {
    if (!client) return;
    // 이미 데이터가 있으면 초기 로딩 스킵
    if (Object.keys(useIssueStore.getState().issues).length > 0) return;

    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    const initialStart = now - oneMonthMs;
    const initialEnd = now + oneMonthMs;

    fetchRangesIfNeeded(initialStart, initialEnd);
  }, [client, fetchRangesIfNeeded]);

  // 사용자 목록 변경 시 데이터 초기화 및 재조회
  const isFirstMount = useRef(true);
  const prevUserIdsRef = useRef<string>('');

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // 초기 사용자 ID 목록 저장
      prevUserIdsRef.current = users.map((u) => u.id).join(',');
      return;
    }
    if (!client) return;

    // 사용자 ID 목록이 실제로 변경되었는지 확인
    const currentUserIds = users.map((u) => u.id).join(',');
    if (prevUserIdsRef.current === currentUserIds) {
      // ID 목록이 동일하면 재조회하지 않음
      return;
    }
    prevUserIdsRef.current = currentUserIds;

    // 기존 데이터 초기화
    clear();
    fetchingRanges.current.clear();
    // stateRef도 함께 초기화 (fetchRangesIfNeeded가 참조하는 값)
    stateRef.current.fetchedRanges = [];

    // 현재 구간 재조회
    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    fetchRangesIfNeeded(now - oneMonthMs, now + oneMonthMs);
  }, [users, client, clear, fetchRangesIfNeeded]);

  // 타임라인 이벤트 핸들러
  const handleTimeChange = useCallback(
    (start: number, end: number, updateScrollCanvas: (start: number, end: number) => void) => {
      // debounce 적용된 조회
      debouncedFetchRef.current?.(start, end);

      // 스크롤 캔버스는 즉시 업데이트
      updateScrollCanvas(start, end);

      // controlled mode 상태 업데이트
      setVisibleTimeStart(start);
      setVisibleTimeEnd(end);

      // 현재 보이는 범위 저장 (새로고침 시 사용)
      setVisibleRange({
        start: moment(start).format('YYYY-MM-DD'),
        end: moment(end).format('YYYY-MM-DD'),
      });
    },
    [],
  );

  // 오늘 날짜로 이동 핸들러
  const handleGoToToday = useCallback(() => {
    const start = moment().add(-1, 'month').valueOf();
    const end = moment().add(1, 'month').valueOf();
    setVisibleTimeStart(start);
    setVisibleTimeEnd(end);
    setVisibleRange({
      start: moment(start).format('YYYY-MM-DD'),
      end: moment(end).format('YYYY-MM-DD'),
    });
    fetchRangesIfNeeded(start, end);
  }, [fetchRangesIfNeeded]);

  // 현재 구간 새로고침 핸들러
  const handleRefreshVisibleRange = useCallback(() => {
    // fetchedRanges에서 현재 범위 제거
    removeFetchedRange(visibleRange);

    // stateRef 업데이트 (fetchRangesIfNeeded가 참조하는 값)
    stateRef.current.fetchedRanges = useIssueStore.getState().fetchedRanges;

    // 재조회 트리거 (버퍼 포함)
    const start = moment(visibleRange.start).valueOf();
    const end = moment(visibleRange.end).valueOf();
    fetchRangesIfNeeded(start, end);
  }, [visibleRange, removeFetchedRange, fetchRangesIfNeeded]);

  // store의 issues를 배열로 변환
  const issueList = useMemo(() => Object.values(issues), [issues]);

  // 조회 완료된(isVerified) 사용자만 필터링
  const verifiedUsers = useMemo(() => users.filter((user) => user.isVerified), [users]);

  // 타임라인용 데이터 변환 - groups (조회 완료된 사용자만 표시)
  const groups = useMemo(() => {
    return verifiedUsers.map((user) => ({
      id: user.id,
      title: user.displayName ?? user.id,
    }));
  }, [verifiedUsers]);

  // 타임라인용 데이터 변환 - items
  const items = useMemo(() => {
    return issueList
      .filter((issue) => issue.userId && issue.startTime && issue.endTime)
      .map((issue) => ({
        id: issue.key,
        group: issue.userId,
        title: issue.summary,
        start_time: moment(issue.startTime),
        end_time: moment(issue.endTime).add(1, 'day'),
        statusCategory: issue.statusCategory,
        statusName: issue.status,
        dateSourceLabel: issue.dateSource.label,
        startTime: issue.startTime,
        endTime: issue.endTime,
      }));
  }, [issueList]);

  // 등록된 사용자가 없으면 안내 메시지 표시
  if (users.length === 0) {
    return (
      <div>
        <Header />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-57px)] gap-4 text-gray-500">
          <p>등록된 사용자가 없습니다.</p>
          <p className="text-sm">사용자를 등록하면 타임라인에서 업무 현황을 확인할 수 있습니다.</p>
          <UserRegisterModal />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />

      <Timeline
        groups={groups}
        items={items}
        visibleTimeStart={visibleTimeStart}
        visibleTimeEnd={visibleTimeEnd}
        onTimeChange={handleTimeChange}
        canMove={false}
        canResize={false}
        minZoom={5 * 24 * 60 * 60 * 1000}
        maxZoom={3 * 30 * 24 * 60 * 60 * 1000}
        lineHeight={60}
        itemRenderer={({ item, itemContext, getItemProps, getResizeProps }) => {
          const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
          const colors = getStatusColors(item.statusCategory?.key);
          return (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    {...getItemProps({
                      style: { padding: '0 3px', background: 'none', border: 'none' },
                    })}
                    onClick={() => {
                      window.open(`https://whatap-labs.atlassian.net/browse/${item.id}`, '_blank');
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.textColor,
                        borderColor: colors.borderColor,
                        borderStyle: 'solid',
                        borderWidth: itemContext.selected ? 3 : 1,
                        borderRadius: 4,
                        boxSizing: 'border-box',
                        height: itemContext.dimensions.height,
                        cursor: 'pointer',
                      }}
                    >
                      {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}

                      <div
                        style={{
                          overflow: 'hidden',
                          paddingLeft: 3,
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          height: '100%',
                        }}
                      >
                        {itemContext.title}
                      </div>

                      {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">{itemContext.title}</div>
                    {item.statusName && (
                      <div style={{ color: colors.textColor }}>{item.statusName}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {item.startTime} ~ {item.endTime} ({item.dateSourceLabel})
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }}
        sidebarWidth={150}
        stackItems
        groupRenderer={({ group }) => {
          return (
            <div
              style={{
                padding: '0 8px',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: 13,
                }}
              >
                {group.title}
              </div>
            </div>
          );
        }}
      >
        <TimelineMarkers>
          <TodayMarker date={new Date()} />
        </TimelineMarkers>
        <TimelineHeaders>
          <SidebarHeader>
            {({ getRootProps }) => {
              return <div {...getRootProps()} />;
            }}
          </SidebarHeader>
          <DateHeader unit='primaryHeader' />
          <DateHeader
            labelFormat={([startTime, endTime], unit) => {
              switch (unit) {
                case 'day':
                  return startTime.format('DD');
                case 'month':
                  return startTime.format('M월');
                default:
                  return endTime.toString();
              }
            }}
          />
        </TimelineHeaders>
      </Timeline>

      <GoToTodayButton onGoToToday={handleGoToToday} />
      <RefreshVisibleRangeButton
        onRefresh={handleRefreshVisibleRange}
        isLoading={isLoading()}
      />
    </div>
  );
}

export default MainPage;
