import { query } from '../../database/index.js';
import { StatusService } from '../status/statusService.js';
import { toHotelLocalTime, calculateStayDuration } from '../../utils/timezone.js';
import { formatInTimeZone } from 'date-fns-tz';
import { config } from '../../config/index.js';

export class DashboardService {
  static async getDashboardMetrics() {
    const now = new Date();
    const todayStr = formatInTimeZone(now, config.hotelTimezone, 'yyyy-MM-dd');

    // 1. Total active dogs
    const dogsRes = await query('SELECT COUNT(*)::int as total FROM dogs WHERE is_archived = FALSE');
    const totalDogs = dogsRes.rows[0].total;

    // 2. Status counts from active stays
    const statusCountsRes = await query(
      `
      SELECT current_status, COUNT(*)::int as count
      FROM bookings
      GROUP BY current_status;
      `
    );

    const countsMap: Record<string, number> = {
      IN_HOTEL: 0,
      UPCOMING: 0,
      OUTGOING: 0,
      COMPLETE: 0,
      CANCEL: 0,
      RECEIVED: 0
    };

    for (const row of statusCountsRes.rows) {
      if (row.current_status in countsMap) {
        countsMap[row.current_status] = row.count;
      }
    }

    // 3. Today's Check-ins and Check-outs
    const checkInsRes = await query(
      `
      SELECT b.*,
             d.id as dog_id,
             d.name as dog_name,
             d.avatar_id as dog_avatar_id,
             o.name as owner_name
      FROM bookings b
      JOIN dogs d ON b.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE DATE(b.check_in_at AT TIME ZONE $1) = $2
      ORDER BY b.check_in_at ASC;
      `,
      [config.hotelTimezone, todayStr]
    );

    const checkOutsRes = await query(
      `
      SELECT b.*,
             d.id as dog_id,
             d.name as dog_name,
             d.avatar_id as dog_avatar_id,
             o.name as owner_name
      FROM bookings b
      JOIN dogs d ON b.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE DATE(b.check_out_at AT TIME ZONE $1) = $2
      ORDER BY b.check_out_at ASC;
      `,
      [config.hotelTimezone, todayStr]
    );

    // 4. Overdue checkout attention list
    const activeStaysRes = await query(
      `
      SELECT b.*,
             d.id as dog_id,
             d.name as dog_name,
             d.avatar_id as dog_avatar_id,
             d.breed as dog_breed,
             o.name as owner_name,
             o.display_phone as owner_phone
      FROM bookings b
      JOIN dogs d ON b.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE b.current_status IN ('IN_HOTEL', 'OUTGOING')
        AND b.check_out_at <= NOW()
      ORDER BY b.check_out_at ASC;
      `
    );

    const overdueAttentionDogs = activeStaysRes.rows
      .map((row) => {
        const attention = StatusService.getCheckoutAttentionState(row, now);
        if (!attention.requiresAttention) return null;

        const outLocal = toHotelLocalTime(row.check_out_at);
        return {
          bookingId: row.id,
          dogId: row.dog_id,
          dogName: row.dog_name,
          dogBreed: row.dog_breed,
          dogAvatarId: row.dog_avatar_id,
          ownerName: row.owner_name,
          ownerPhone: row.owner_phone,
          scheduledCheckOut: row.check_out_at,
          scheduledCheckOutFormatted: `${outLocal.dateFormatted} at ${outLocal.timeFormatted}`,
          currentStatus: row.current_status,
          attention
        };
      })
      .filter(Boolean);

    // 5. Today's Check-In & Out list
    const combinedTodayRes = await query(
      `
      SELECT b.*,
             d.id as dog_id,
             d.name as dog_name,
             d.avatar_id as dog_avatar_id,
             o.name as owner_name
      FROM bookings b
      JOIN dogs d ON b.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE DATE(b.check_in_at AT TIME ZONE $1) = $2
         OR DATE(b.check_out_at AT TIME ZONE $1) = $2
      ORDER BY b.check_in_at ASC
      LIMIT 10;
      `,
      [config.hotelTimezone, todayStr]
    );

    const todaysList = combinedTodayRes.rows.map((row) => {
      const inLocal = toHotelLocalTime(row.check_in_at);
      const outLocal = toHotelLocalTime(row.check_out_at);
      const dur = calculateStayDuration(row.check_in_at, row.check_out_at);
      const attention = StatusService.getCheckoutAttentionState(row, now);

      return {
        bookingId: row.id,
        dogId: row.dog_id,
        dogName: row.dog_name,
        dogAvatarId: row.dog_avatar_id,
        ownerName: row.owner_name,
        timeFormatted: inLocal.timeFormatted,
        status: row.current_status,
        durationLabel: dur.label,
        attention
      };
    });

    return {
      stats: {
        totalDogs,
        inHotelCount: countsMap.IN_HOTEL,
        upcomingCount: countsMap.UPCOMING,
        outgoingCount: countsMap.OUTGOING,
        completeCount: countsMap.COMPLETE,
        cancelCount: countsMap.CANCEL,
        receivedCount: countsMap.RECEIVED,
        todayCheckIn: checkInsRes.rowCount || 0,
        todayCheckOut: checkOutsRes.rowCount || 0,
        overdueAttentionCount: overdueAttentionDogs.length
      },
      overdueAttentionList: overdueAttentionDogs,
      todayCheckInOut: todaysList
    };
  }
}
