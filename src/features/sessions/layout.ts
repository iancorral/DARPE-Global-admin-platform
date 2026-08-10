export type Placeable = {
  id: string;
  startMinutes: number;
  durationMinutes: number;
};

export type PlacedItem = {
  id: string;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
};

const MIN_CARD_HEIGHT = 26;

/**
 * Positions one day's sessions inside the time grid. Sessions that overlap in
 * time are split into side-by-side columns so none of them can hide another.
 */
export function placeDaySessions(
  items: Placeable[],
  dayStartMinutes: number,
  pixelsPerHour: number
): PlacedItem[] {
  const sorted = [...items].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes
  );

  const placed: PlacedItem[] = [];
  let cluster: Placeable[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const columnEnds: number[] = [];
    const assignments = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.startMinutes);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = item.startMinutes + item.durationMinutes;
      return { item, column };
    });

    const columnCount = columnEnds.length;
    for (const { item, column } of assignments) {
      placed.push({
        id: item.id,
        top: ((item.startMinutes - dayStartMinutes) / 60) * pixelsPerHour,
        height: Math.max((item.durationMinutes / 60) * pixelsPerHour, MIN_CARD_HEIGHT),
        leftPercent: (column / columnCount) * 100,
        widthPercent: 100 / columnCount,
      });
    }

    cluster = [];
  };

  for (const item of sorted) {
    if (item.startMinutes >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.startMinutes + item.durationMinutes);
  }
  flushCluster();

  return placed;
}

/**
 * The hour range the grid must cover: a comfortable default, widened when
 * sessions fall outside it so nothing is ever cropped out of view.
 */
export function visibleHourRange(
  items: Placeable[],
  defaultStartHour = 8,
  defaultEndHour = 20
): { startHour: number; endHour: number } {
  let startHour = defaultStartHour;
  let endHour = defaultEndHour;

  for (const item of items) {
    startHour = Math.min(startHour, Math.floor(item.startMinutes / 60));
    endHour = Math.max(endHour, Math.ceil((item.startMinutes + item.durationMinutes) / 60));
  }

  return {
    startHour: Math.max(0, startHour),
    endHour: Math.min(24, Math.max(endHour, startHour + 1)),
  };
}
