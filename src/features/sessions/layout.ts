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
      /*
       * Each card then widens to the right for as long as nothing is in the
       * way, instead of every card in the cluster keeping one narrow slice.
       *
       * Splitting a cluster equally is what made a day with three classes
       * unreadable: three cards of about 45px each, every name truncated to
       * "Lu…". In practice a cluster is rarely a solid block — one class
       * overlaps another for half an hour and then the column is free — so
       * most cards can take the empty space beside them and stay legible.
       * This is the layout a calendar application uses, and it changes nothing
       * about which classes exist or when: purely how wide they are drawn.
       */
      const endsAt = item.startMinutes + item.durationMinutes;
      let span = 1;

      while (column + span < columnCount) {
        const blocked = assignments.some(
          (other) =>
            other.column === column + span &&
            other.item.startMinutes < endsAt &&
            item.startMinutes < other.item.startMinutes + other.item.durationMinutes
        );

        if (blocked) break;
        span += 1;
      }

      placed.push({
        id: item.id,
        top: ((item.startMinutes - dayStartMinutes) / 60) * pixelsPerHour,
        height: Math.max((item.durationMinutes / 60) * pixelsPerHour, MIN_CARD_HEIGHT),
        leftPercent: (column / columnCount) * 100,
        widthPercent: (span / columnCount) * 100,
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
 * The hour range the grid must cover: a default working day, widened when
 * sessions fall outside it so nothing is ever cropped out of view.
 *
 * The default runs 07:00–22:00 because DARPE teaches online across time zones,
 * so an early class before work or a late one at night is ordinary rather than
 * exceptional. It matters beyond display: creation positions only exist inside
 * the visible range, so a narrower default made those hours unbookable unless
 * a class already happened to be there.
 *
 * The bounds are parameters so that a future Settings screen can hand the
 * academy's real operating hours in without this module changing.
 */
export function visibleHourRange(
  items: Placeable[],
  defaultStartHour = 7,
  defaultEndHour = 22
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
