import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';

import { SettingDialog } from '@/3_widgets/setting-dialog';
import { getIssues } from '@/5_entities/jira';

function MainPage() {
  const { data } = useQuery({ queryKey: ['getIssues'], queryFn: getIssues });

  if (!data) {
    return <SettingDialog />;
  }

  const issues =
    data?.issues?.map((issue) => ({
      key: issue.key,
      assignee: issue.fields.assignee.displayName,
      creator: issue.fields.creator.displayName,
      link: `https://whatap-labs.atlassian.net/browse/${issue.key}`,
      startTime: moment(issue.fields.customfield_10156),
      endTime: moment(issue.fields.customfield_10157).add(1, 'day'),
      summary: issue.fields.summary,
      issueType: issue.fields.issueType?.name,
      status: issue.fields.status?.name,
    })) ?? [];

  console.log('issues', issues);

  const groups = issues.reduce<{ id: number | string; title: string }[]>((acc, issue) => {
    if (acc.find((item) => item.id === issue.assignee)) {
      return acc;
    }

    return [...acc, { id: issue.assignee ?? '', title: issue.assignee ?? '' }];
  }, []);

  const items = issues.map((issue) => ({
    id: issue.key,
    group: issue.assignee ?? '',
    title: issue.summary,
    start_time: issue.startTime,
    end_time: issue.endTime,
  }));

  return (
    <div>
      <Timeline
        groups={groups}
        items={items}
        defaultTimeStart={moment().add(-1, 'month')}
        defaultTimeEnd={moment().add(1, 'month')}
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
                onMouseDown: () => {
                  console.log('on item click', item);
                },
              })}
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
