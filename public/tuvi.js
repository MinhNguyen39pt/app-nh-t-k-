/* Âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7) + an sao Tử Vi Đẩu Số */
(function (root) {
  'use strict';
  const INT = Math.floor;
  const TZ = 7;
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const mod = (a, n) => ((a % n) + n) % n;

  // ================= ÂM LỊCH =================
  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function jdToDate(jd) {
    let a, b, c;
    if (jd > 2299160) { a = jd + 32044; b = INT((4 * a + 3) / 146097); c = a - INT((b * 146097) / 4); }
    else { b = 0; c = jd + 32082; }
    const d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
    return [e - INT((153 * m + 2) / 5) + 1, m + 3 - 12 * INT(m / 10), b * 100 + d - 4800 + INT(m / 10)];
  }
  function newMoon(k) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltat = T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }
  const getNewMoonDay = (k) => INT(newMoon(k) + 0.5 + TZ / 24);
  function sunLong(jdn) {
    const T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = Math.PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= Math.PI * 2 * INT(L / (Math.PI * 2));
    return L;
  }
  const getSunLongitude = (dayNumber) => INT((sunLong(dayNumber - 0.5 - TZ / 24) / Math.PI) * 6);
  function getLunarMonth11(yy) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k);
    if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);
    return nm;
  }
  function getLeapMonthOffset(a11) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1, arc = getSunLongitude(getNewMoonDay(k + i));
    do { last = arc; i++; arc = getSunLongitude(getNewMoonDay(k + i)); } while (arc !== last && i < 14);
    return i - 1;
  }
  const cache = new Map();
  function solar2lunar(dd, mm, yy) {
    const key = yy * 10000 + mm * 100 + dd;
    if (cache.has(key)) return cache.get(key);
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
    let a11 = getLunarMonth11(yy), b11 = a11, lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1); }
    else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1); }
    const day = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11) / 29);
    let leap = 0, month = diff + 11;
    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11);
      if (diff >= leapMonthDiff) { month = diff + 10; if (diff === leapMonthDiff) leap = 1; }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) lunarYear -= 1;
    const r = { day, month, year: lunarYear, leap, jd: dayNumber };
    if (cache.size > 5000) cache.clear();
    cache.set(key, r);
    return r;
  }
  function lunar2solar(ld, lm, ly, leap) {
    let a11, b11;
    if (lm < 11) { a11 = getLunarMonth11(ly - 1); b11 = getLunarMonth11(ly); }
    else { a11 = getLunarMonth11(ly); b11 = getLunarMonth11(ly + 1); }
    const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let off = lm - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      const leapOff = getLeapMonthOffset(a11);
      let leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;
      if (leap && lm !== leapMonth) return null;
      if (leap || off >= leapOff) off += 1;
    } else if (leap) return null;
    const monthStart = getNewMoonDay(k + off);
    return jdToDate(monthStart + ld - 1);
  }
  const yearCanChi = (y) => CAN[mod(y + 6, 10)] + ' ' + CHI[mod(y + 8, 12)];
  const dayCanChi = (jd) => CAN[mod(jd + 9, 10)] + ' ' + CHI[mod(jd + 1, 12)];
  const monthCanChi = (m, y) => CAN[mod(y * 12 + m + 3, 10)] + ' ' + CHI[mod(m + 1, 12)];
  const HD = ['110100101100', '001101001011', '110011010010', '101100110100', '001011001101', '010010110011'];
  function gioHoangDao(jd) {
    const pat = HD[mod(jd + 1, 12) % 6];
    const out = [];
    for (let i = 0; i < 12; i++) if (pat[i] === '1') out.push(`${CHI[i]} (${mod(i * 2 - 1, 24)}-${(i * 2 + 1) % 24}h)`);
    return out;
  }
  const hourChi = (h) => INT((h + 1) / 2) % 12;

  // Thông tin âm lịch đầy đủ cho một chuỗi 'YYYY-MM-DD...'
  function info(iso) {
    const y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
    const l = solar2lunar(d, m, y);
    return {
      ...l,
      text: `${l.day}/${l.month}${l.leap ? ' nhuận' : ''}`,
      yearCC: yearCanChi(l.year),
      monthCC: monthCanChi(l.month, l.year),
      dayCC: dayCanChi(l.jd),
    };
  }

  // ================= TỬ VI =================
  const PALACES = ['Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ'];
  const ELEM = ['Kim', 'Thủy', 'Mộc', 'Hỏa', 'Thổ'];
  // Nạp âm theo cặp trong 60 hoa giáp
  const NAP = 'Kim Hỏa Mộc Thổ Kim Hỏa Thủy Thổ Kim Mộc Thủy Thổ Hỏa Mộc Thủy Kim Hỏa Mộc Thổ Kim Hỏa Thủy Thổ Kim Mộc Thủy Thổ Hỏa Mộc Thủy'.split(' ');
  const NAP_NAME = ['Hải Trung Kim', 'Lư Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Thoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
  const napIdx = (c, z) => INT(mod(6 * c - 5 * z, 60) / 2);
  const CUC = { 'Thủy': 2, 'Mộc': 3, 'Kim': 4, 'Thổ': 5, 'Hỏa': 6 };
  const CUC_NAME = { 2: 'Thủy nhị cục', 3: 'Mộc tam cục', 4: 'Kim tứ cục', 5: 'Thổ ngũ cục', 6: 'Hỏa lục cục' };
  const SINH = { 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim', 'Kim': 'Thủy', 'Thủy': 'Mộc' };
  const KHAC = { 'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim', 'Kim': 'Mộc' };

  // Độ sáng chính tinh theo cung Tý..Hợi (M miếu, V vượng, Đ đắc, B bình, H hãm) — bảng phổ biến, các trường phái có khác biệt
  const BRIGHT = {
    'Tử Vi': 'BĐMBVMMĐMBVB', 'Thiên Cơ': 'ĐĐHMMVĐĐVMMH', 'Thái Dương': 'HĐVVVMMĐHHHH', 'Vũ Khúc': 'VMVĐMHVMVĐMH',
    'Thiên Đồng': 'VHMĐHĐHHMHHĐ', 'Liêm Trinh': 'VĐVHMHVĐVHMH', 'Thiên Phủ': 'MBMBVĐMĐMBVĐ', 'Thái Âm': 'VĐBHHHHĐVMMM',
    'Tham Lang': 'BMĐBVHBMĐBVH', 'Cự Môn': 'VHVMHHVHĐMHĐ', 'Thiên Tướng': 'VĐMHVĐVĐMHVĐ', 'Thiên Lương': 'VĐVVMHMĐVHMH',
    'Thất Sát': 'MĐMHHVMĐMHHV', 'Phá Quân': 'MVHHĐHMVHHĐH',
  };
  const TU_HOA = [
    ['Liêm Trinh', 'Phá Quân', 'Vũ Khúc', 'Thái Dương'], ['Thiên Cơ', 'Thiên Lương', 'Tử Vi', 'Thái Âm'],
    ['Thiên Đồng', 'Thiên Cơ', 'Văn Xương', 'Liêm Trinh'], ['Thái Âm', 'Thiên Đồng', 'Thiên Cơ', 'Cự Môn'],
    ['Tham Lang', 'Thái Âm', 'Hữu Bật', 'Thiên Cơ'], ['Vũ Khúc', 'Tham Lang', 'Thiên Lương', 'Văn Khúc'],
    ['Thái Dương', 'Vũ Khúc', 'Thái Âm', 'Thiên Đồng'], ['Cự Môn', 'Thái Dương', 'Văn Khúc', 'Văn Xương'],
    ['Thiên Lương', 'Tử Vi', 'Tả Phù', 'Vũ Khúc'], ['Phá Quân', 'Cự Môn', 'Thái Âm', 'Tham Lang'],
  ];
  const HOA = ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Hóa Kỵ'];
  const TRANG_SINH = ['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng'];
  const BAC_SI = ['Bác Sĩ', 'Lực Sĩ', 'Thanh Long', 'Tiểu Hao', 'Tướng Quân', 'Tấu Thư', 'Phi Liêm', 'Hỷ Thần', 'Bệnh Phù', 'Đại Hao', 'Phục Binh', 'Quan Phủ'];
  const MENH_CHU = ['Tham Lang', 'Cự Môn', 'Lộc Tồn', 'Văn Khúc', 'Liêm Trinh', 'Vũ Khúc', 'Phá Quân', 'Vũ Khúc', 'Liêm Trinh', 'Văn Khúc', 'Lộc Tồn', 'Cự Môn'];
  const THAN_CHU = ['Hỏa Tinh', 'Thiên Tướng', 'Thiên Lương', 'Thiên Đồng', 'Văn Xương', 'Thiên Cơ'];
  const GOOD = ['Tả Phù', 'Hữu Bật', 'Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt', 'Lộc Tồn', 'Thiên Mã', 'Hồng Loan', 'Thiên Hỷ', 'Đào Hoa', 'Tam Thai', 'Bát Tọa', 'Ân Quang', 'Thiên Quý', 'Thiên Y'];

  /**
   * p: { name, gender: 'nam'|'nu', date: 'YYYY-MM-DD' (dương lịch), time: 'HH:mm' }
   */
  function lapLaSo(p) {
    let [yy, mm, dd] = p.date.split('-').map(Number);
    const [hh, mi] = (p.time || '12:00').split(':').map(Number);
    // Sinh từ 23h: tính sang ngày hôm sau (giờ Tý đầu ngày mới)
    if (hh >= 23) { [dd, mm, yy] = jdToDate(jdFromDate(dd, mm, yy) + 1); }
    const L = solar2lunar(dd, mm, yy);
    const h = hourChi(hh);
    // Tháng nhuận: nửa đầu tính tháng đó, từ ngày 16 tính tháng sau
    let m = L.month;
    if (L.leap && L.day > 15) m = (m % 12) + 1;
    const d = L.day;
    const yc = mod(L.year + 6, 10), yz = mod(L.year + 8, 12);
    const nam = p.gender !== 'nu';
    const duong = yc % 2 === 0;
    const thuan = (duong && nam) || (!duong && !nam);
    const amDuong = (duong ? 'Dương ' : 'Âm ') + (nam ? 'Nam' : 'Nữ');

    const cells = Array.from({ length: 12 }, (_, z) => ({ chi: z, chiName: CHI[z], name: '', can: '', main: [], good: [], bad: [], other: [], ts: '', bs: '', daiVan: 0, tuan: false, triet: false, isThan: false }));
    const put = (z, star, kind) => cells[mod(z, 12)][kind].push(star);

    // Mệnh, Thân, 12 cung
    const menh = mod(2 + (m - 1) - h, 12);
    const than = mod(2 + (m - 1) + h, 12);
    for (let i = 0; i < 12; i++) cells[mod(menh + i, 12)].name = PALACES[i];
    cells[than].isThan = true;
    // Can các cung (Ngũ hổ độn)
    const canDan = mod((yc % 5) * 2 + 2, 10);
    cells.forEach((c) => (c.can = CAN[mod(canDan + mod(c.chi - 2, 12), 10)]));
    // Cục
    const menhCan = mod(canDan + mod(menh - 2, 12), 10);
    const cucElem = NAP[napIdx(menhCan, menh)];
    const cuc = CUC[cucElem];
    // Bản mệnh (nạp âm năm sinh)
    const bm = napIdx(yc, yz);
    const banMenh = NAP_NAME[bm], banMenhElem = NAP[bm];
    let quanHe = 'Mệnh – Cục bình hòa';
    if (SINH[cucElem] === banMenhElem) quanHe = 'Cục sinh Mệnh (tốt)';
    else if (SINH[banMenhElem] === cucElem) quanHe = 'Mệnh sinh Cục (vất vả, hao lực)';
    else if (KHAC[cucElem] === banMenhElem) quanHe = 'Cục khắc Mệnh (kém thuận)';
    else if (KHAC[banMenhElem] === cucElem) quanHe = 'Mệnh khắc Cục (tự lực, vất vả mới thành)';

    // Tử Vi
    let x = 0;
    while ((d + x) % cuc !== 0) x++;
    const q = (d + x) / cuc;
    const tv = mod(2 + q - 1 + (x % 2 ? -x : x), 12);
    const tp = mod(4 - tv, 12);
    const MAIN = [['Tử Vi', tv], ['Thiên Cơ', tv - 1], ['Thái Dương', tv - 3], ['Vũ Khúc', tv - 4], ['Thiên Đồng', tv - 5], ['Liêm Trinh', tv - 8],
      ['Thiên Phủ', tp], ['Thái Âm', tp + 1], ['Tham Lang', tp + 2], ['Cự Môn', tp + 3], ['Thiên Tướng', tp + 4], ['Thiên Lương', tp + 5], ['Thất Sát', tp + 6], ['Phá Quân', tp + 10]];
    const pos = {};
    for (const [n, z] of MAIN) { const zz = mod(z, 12); pos[n] = zz; put(zz, { name: n, b: [...BRIGHT[n]][zz], hoa: '' }, 'main'); }

    // Phụ tinh
    const aux = (n, z, kind) => { const zz = mod(z, 12); pos[n] = zz; put(zz, { name: n, hoa: '' }, kind || (GOOD.includes(n) ? 'good' : 'bad')); };
    aux('Tả Phù', 4 + m - 1); aux('Hữu Bật', 10 - (m - 1));
    aux('Văn Xương', 10 - h); aux('Văn Khúc', 4 + h);
    const KV = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [3, 5], [3, 5]];
    aux('Thiên Khôi', KV[yc][0]); aux('Thiên Việt', KV[yc][1]);
    const LOC = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][yc];
    aux('Lộc Tồn', LOC); aux('Kình Dương', LOC + 1); aux('Đà La', LOC - 1);
    const grp = [0, 1, 2, 3].find((g) => [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]][g].includes(yz)); // Thân Tý Thìn / Tỵ Dậu Sửu / Dần Ngọ Tuất / Hợi Mão Mùi
    const HOA_START = [2, 3, 1, 9][grp], LINH_START = [10, 10, 3, 10][grp];
    aux('Hỏa Tinh', thuan ? HOA_START + h : HOA_START - h);
    aux('Linh Tinh', thuan ? LINH_START - h : LINH_START + h);
    aux('Địa Kiếp', 11 + h); aux('Địa Không', 11 - h);
    aux('Thiên Mã', [2, 11, 8, 5][grp]);
    aux('Đào Hoa', [9, 6, 3, 0][grp]);
    aux('Hồng Loan', 3 - yz); aux('Thiên Hỷ', 3 - yz + 6);
    aux('Thiên Khốc', 6 - yz); aux('Thiên Hư', 6 + yz);
    const CQ = [[2, 10], [2, 10], [5, 1], [5, 1], [5, 1], [8, 4], [8, 4], [8, 4], [11, 7], [11, 7], [11, 7], [2, 10]][yz];
    aux('Cô Thần', CQ[0]); aux('Quả Tú', CQ[1]);
    aux('Thiên Hình', 9 + m - 1); aux('Thiên Diêu', 1 + m - 1); aux('Thiên Y', 1 + m - 1);
    aux('Tam Thai', pos['Tả Phù'] + d - 1); aux('Bát Tọa', pos['Hữu Bật'] - (d - 1));
    aux('Ân Quang', pos['Văn Xương'] + d - 2); aux('Thiên Quý', pos['Văn Khúc'] - (d - 2));

    // Tứ Hóa
    TU_HOA[yc].forEach((n, i) => {
      for (const c of cells) for (const k of ['main', 'good', 'bad']) c[k].forEach((s) => { if (s.name === n) s.hoa = HOA[i]; });
    });
    // Vòng Tràng Sinh & Lộc Tồn (Bác Sĩ)
    const tsStart = { 2: 8, 5: 8, 3: 11, 4: 5, 6: 2 }[cuc];
    TRANG_SINH.forEach((n, i) => (cells[mod(tsStart + (thuan ? i : -i), 12)].ts = n));
    BAC_SI.forEach((n, i) => (cells[mod(LOC + (thuan ? i : -i), 12)].bs = n));
    // Tuần, Triệt
    const TRIET = [[8, 9], [6, 7], [4, 5], [2, 3], [0, 1]][yc % 5];
    TRIET.forEach((z) => (cells[z].triet = true));
    [mod(yz - yc + 10, 12), mod(yz - yc + 11, 12)].forEach((z) => (cells[z].tuan = true));
    // Đại vận
    for (let i = 0; i < 12; i++) cells[mod(menh + (thuan ? i : -i), 12)].daiVan = cuc + i * 10;

    return {
      input: p, lunar: { day: d, month: L.month, year: L.year, leap: L.leap, text: `${d}/${L.month}${L.leap ? ' nhuận' : ''}/${L.year}` },
      hourChi: h, yearCC: `${CAN[yc]} ${CHI[yz]}`, yc, yz, monthCC: monthCanChi(L.month, L.year), dayCC: dayCanChi(L.jd), hourCC: `${CAN[mod((mod(L.jd + 9, 10) % 5) * 2 + h, 10)]} ${CHI[h]}`,
      mAdj: m, nam, thuan, amDuong, menh, than, cuc, cucName: CUC_NAME[cuc], cucElem, banMenh, banMenhElem, quanHe,
      menhChu: MENH_CHU[menh], thanChu: THAN_CHU[yz % 6], cells, pos,
      thanCu: cells[than].name,
    };
  }

  // Vận hạn tại một ngày dương lịch 'YYYY-MM-DD'
  function vanHan(ch, iso) {
    const l = info(iso);
    const age = l.year - ch.lunar.year + 1; // tuổi mụ
    let daiVan = null;
    for (const c of ch.cells) if (age >= c.daiVan && age < c.daiVan + 10) daiVan = c.chi;
    const thStart = [10, 7, 4, 1][[0, 1, 2, 3].find((g) => [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]][g].includes(ch.yz))];
    const tieuHan = mod(thStart + (ch.nam ? 1 : -1) * (age - 1), 12);
    // Lưu nguyệt: từ cung tiểu hạn gọi tháng 1, đếm nghịch đến tháng sinh, rồi gọi giờ Tý đếm thuận đến giờ sinh => tháng Giêng
    const thang1 = mod(tieuHan - ch.mAdj + 1 + ch.hourChi, 12);
    const luuNguyet = mod(thang1 + l.month - 1, 12);
    const luuThaiTue = mod(l.year + 8, 12);
    const nm = (z) => (z == null ? '' : `${ch.cells[z].name} (${CHI[z]})`);
    return { lunar: l, age, daiVan, tieuHan, luuNguyet, luuThaiTue, text: { daiVan: daiVan == null ? 'chưa vào đại vận' : nm(daiVan), tieuHan: nm(tieuHan), luuNguyet: nm(luuNguyet), luuThaiTue: nm(luuThaiTue) } };
  }

  // Mô tả lá số dạng văn bản cho AI
  const starTxt = (s) => s.name + (s.b ? ` (${{ M: 'miếu', V: 'vượng', 'Đ': 'đắc', B: 'bình', H: 'hãm' }[s.b]})` : '') + (s.hoa ? ` [${s.hoa}]` : '');
  function cellText(ch, z) {
    const c = ch.cells[z];
    return `Cung ${c.name} tại ${c.can} ${c.chiName}${c.isThan ? ' (Thân cư)' : ''}: chính tinh ${c.main.length ? c.main.map(starTxt).join(', ') : 'vô chính diệu'}; cát tinh ${c.good.map(starTxt).join(', ') || '—'}; sát/hung tinh ${c.bad.map(starTxt).join(', ') || '—'}; ${c.ts}, ${c.bs}${c.tuan ? ', có Tuần' : ''}${c.triet ? ', có Triệt' : ''}; đại vận từ ${c.daiVan} tuổi.`;
  }
  function chartText(ch) {
    const p = ch.input;
    const head = `Lá số: ${p.name || 'Đương số'}, ${ch.nam ? 'nam' : 'nữ'}, sinh dương lịch ${p.date} ${p.time}, âm lịch ${ch.lunar.text} (năm ${ch.yearCC}, tháng ${ch.monthCC}, ngày ${ch.dayCC}, giờ ${ch.hourCC}). ${ch.amDuong}. Bản mệnh ${ch.banMenh} (${ch.banMenhElem}), ${ch.cucName}; ${ch.quanHe}. Mệnh tại ${CHI[ch.menh]}, Thân cư ${ch.thanCu}. Mệnh chủ ${ch.menhChu}, Thân chủ ${ch.thanChu}. Đại vận đi ${ch.thuan ? 'thuận' : 'nghịch'}.`;
    const order = []; for (let i = 0; i < 12; i++) order.push(mod(ch.menh + i, 12));
    return head + '\n' + order.map((z) => '- ' + cellText(ch, z)).join('\n');
  }
  const tamPhuong = (z) => [z, mod(z + 4, 12), mod(z + 8, 12), mod(z + 6, 12)];

  root.AmLich = { solar2lunar, lunar2solar, info, yearCanChi, dayCanChi, monthCanChi, gioHoangDao, jdFromDate, jdToDate, CAN, CHI };
  root.TuVi = { lapLaSo, vanHan, chartText, cellText, tamPhuong, PALACES, CHI };
})(typeof window !== 'undefined' ? window : globalThis);
