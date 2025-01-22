import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale';
import { parseISO } from 'date-fns/parseISO';

/**
 *
 * @desc ISO 형식의 시작 날짜 문자열과 종료 날짜 문자열을 받아, 날짜(dateStr)와 진행 시간 범위(timeRangeStr)을 반환하는 유틸리티 함수입니다.
 */
export const formatDateTimeRange = (startTime: string, endTime: string) => {
  const startDate = parseISO(startTime);
  const endDate = parseISO(endTime);

  const dateStr = format(startDate, 'yyyy.MM.dd(E)', { locale: ko });
  const timeRangeStr = `${format(startDate, 'HH:mm')}-${format(endDate, 'HH:mm')}`;

  return { dateStr, timeRangeStr };
};
