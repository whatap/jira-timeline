import { useCallback, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';

import { SettingDialog } from '@/3_widgets/setting-dialog';
import { getIssues, useIssueStore } from '@/5_entities/jira';
import { useClientStore } from '@/5_entities/jira/jiraClientStore';
import { getNonOverlappingRanges, normalizeDateRange, type DateRange } from '@/6_shared/utils';

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
  const {
    issues,
    fetchedRanges,
    error,
    isLoading,
    addIssues,
    addFetchedRange,
    incrementLoading,
    decrementLoading,
    setError,
  } = useIssueStore();

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
      } catch (err) {
        const message = err instanceof Error ? err.message : '이슈 조회 중 오류가 발생했습니다.';
        setError(message);
        console.error('Failed to fetch issues:', err);
      } finally {
        fetchingRanges.current.delete(rangeKey);
        decrementLoading();
      }
    },
    [addIssues, addFetchedRange, incrementLoading, decrementLoading, setError]
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
    [fetchRange]
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

  // 타임라인 이벤트 핸들러
  const handleTimeChange = useCallback(
    (visibleTimeStart: number, visibleTimeEnd: number, updateScrollCanvas: (start: number, end: number) => void) => {
      // debounce 적용된 조회
      debouncedFetchRef.current?.(visibleTimeStart, visibleTimeEnd);

      // 스크롤 캔버스는 즉시 업데이트
      updateScrollCanvas(visibleTimeStart, visibleTimeEnd);
    },
    []
  );

  // store의 issues를 배열로 변환
  const issueList = useMemo(() => Object.values(issues), [issues]);

  // 타임라인용 데이터 변환 - groups
  const groups = useMemo(() => {
    const uniqueAssignees = new Map<string, { id: string; title: string }>();
    issueList.forEach((issue) => {
      if (issue.assignee && !uniqueAssignees.has(issue.assignee)) {
        uniqueAssignees.set(issue.assignee, {
          id: issue.assignee,
          title: issue.assignee,
        });
      }
    });
    return Array.from(uniqueAssignees.values());
  }, [issueList]);

  // 타임라인용 데이터 변환 - items
  const items = useMemo(() => {
    return issueList
      .filter((issue) => issue.assignee && issue.startTime && issue.endTime)
      .map((issue) => ({
        id: issue.key,
        group: issue.assignee,
        title: issue.summary,
        start_time: moment(issue.startTime),
        end_time: moment(issue.endTime).add(1, 'day'),
      }));
  }, [issueList]);

  // 클라이언트가 없으면 설정 다이얼로그만 표시
  if (!client) {
    return <SettingDialog />;
  }

  return (
    <div>
      {/* 로딩 인디케이터 */}
      {isLoading() && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            borderRadius: 4,
            zIndex: 1000,
          }}
        >
          로딩 중...
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            borderRadius: 4,
            zIndex: 1000,
          }}
        >
          {error}
        </div>
      )}

      <Timeline
        groups={groups}
        items={items}
        defaultTimeStart={moment().add(-1, 'month')}
        defaultTimeEnd={moment().add(1, 'month')}
        onTimeChange={handleTimeChange}
        canMove={false}
        canResize={false}
        minZoom={5 * 24 * 60 * 60 * 1000}
        maxZoom={3 * 30 * 24 * 60 * 60 * 1000}
        lineHeight={50}
        itemRenderer={({ item, itemContext, getItemProps, getResizeProps }) => {
          const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
          return (
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
                  backgroundColor: '#dddddd88',
                  color: '#666',
                  borderColor: '#666',
                  borderStyle: 'solid',
                  borderWidth: itemContext.selected ? 3 : 1,
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  height: itemContext.dimensions.height,
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
          );
        }}
        sidebarWidth={100}
        stackItems
      >
        <TimelineMarkers>
          <TodayMarker date={new Date()} />
        </TimelineMarkers>
        <TimelineHeaders>
          <SidebarHeader>
            {({ getRootProps }) => {
              return (
                <div {...getRootProps()}>
                  <SettingDialog />
                </div>
              );
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
    </div>
  );
}

export default MainPage;
