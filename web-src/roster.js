const CAL_START="2026-01-01";
const CAL={"A": "SSSSDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDSSSSSDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDDHHNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDDHNNNHHHDDDDHHNNNSSSSSNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHH", "B": "SSSSNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNSSSSSNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDSSSSSDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDD", "C": "SSSSHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHSSSSSHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHSSSSSHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNNNNHHDDDDHHNN"};
const HOL={
 "2026-01-01":["วันขึ้นปีใหม่","New Year's Day"],"2026-01-02":["วันหยุดพิเศษ","Special holiday"],
 "2026-03-03":["วันมาฆบูชา","Makha Bucha"],"2026-04-06":["วันจักรี","Chakri Day"],
 "2026-04-13":["วันสงกรานต์","Songkran"],"2026-04-14":["วันสงกรานต์","Songkran"],"2026-04-15":["วันสงกรานต์","Songkran"],
 "2026-05-01":["วันแรงงานแห่งชาติ","Labour Day"],"2026-05-04":["วันฉัตรมงคล","Coronation Day"],
 "2026-05-31":["วันวิสาขบูชา","Visakha Bucha"],"2026-06-01":["ชดเชยวันวิสาขบูชา","Visakha Bucha (observed)"],
 "2026-06-03":["วันเฉลิมฯ พระราชินี","Queen Suthida's Birthday"],"2026-07-28":["วันเฉลิมฯ ร.10","King's Birthday"],
 "2026-07-29":["วันอาสาฬหบูชา","Asarnha Bucha"],"2026-07-30":["วันเข้าพรรษา","Buddhist Lent"],
 "2026-08-12":["วันแม่แห่งชาติ","Mother's Day"],"2026-10-13":["วันนวมินทรมหาราช","King Bhumibol Memorial"],
 "2026-10-23":["วันปิยมหาราช","Chulalongkorn Day"],"2026-12-05":["วันพ่อแห่งชาติ","Father's Day"],
 "2026-12-07":["ชดเชยวันพ่อแห่งชาติ","Father's Day (observed)"],"2026-12-10":["วันรัฐธรรมนูญ","Constitution Day"],
 "2026-12-31":["วันสิ้นปี","New Year's Eve"],
 "2027-01-01":["วันขึ้นปีใหม่","New Year's Day"],"2027-02-21":["วันมาฆบูชา","Makha Bucha"],"2027-02-22":["ชดเชยวันมาฆบูชา","Makha Bucha (observed)"],
 "2027-04-06":["วันจักรี","Chakri Day"],"2027-04-13":["วันสงกรานต์","Songkran"],"2027-04-14":["วันสงกรานต์","Songkran"],"2027-04-15":["วันสงกรานต์","Songkran"],
 "2027-05-01":["วันแรงงานแห่งชาติ","Labour Day"],"2027-05-03":["ชดเชยวันแรงงาน","Labour Day (observed)"],"2027-05-04":["วันฉัตรมงคล","Coronation Day"],
 "2027-05-20":["วันวิสาขบูชา","Visakha Bucha"],"2027-06-03":["วันเฉลิมฯ พระราชินี","Queen Suthida's Birthday"],
 "2027-07-18":["วันอาสาฬหบูชา","Asarnha Bucha"],"2027-07-19":["ชดเชยวันอาสาฬหบูชา","Asarnha Bucha (observed)"],
 "2027-07-28":["วันเฉลิมฯ ร.10","King's Birthday"],"2027-08-12":["วันแม่แห่งชาติ","Mother's Day"],
 "2027-10-13":["วันนวมินทรมหาราช","King Bhumibol Memorial"],"2027-10-23":["วันปิยมหาราช","Chulalongkorn Day"],"2027-10-25":["ชดเชยวันปิยมหาราช","Chulalongkorn Day (observed)"],
 "2027-12-05":["วันพ่อแห่งชาติ","Father's Day"],"2027-12-06":["ชดเชยวันพ่อแห่งชาติ","Father's Day (observed)"],
 "2027-12-10":["วันรัฐธรรมนูญ","Constitution Day"],"2027-12-31":["วันสิ้นปี","New Year's Eve"]
};

/* Company calendar events marked on "Calendar 2026_3G2S Rev.01" (legend: ◇ Company Tour, ⬡ New Year Party, green = substitution of working days) */
const CO_EV = {
  "2026-09-11": { k: "tour", th: "ทัวร์บริษัท", en: "Company Tour" },
  "2026-09-12": { k: "tour", th: "ทัวร์บริษัท", en: "Company Tour" },
  "2026-12-18": { k: "party", th: "งานปาร์ตี้ปีใหม่", en: "New Year Party" }
};
const CO_SUB = { "2026-09-08": ["A"], "2026-09-10": ["A"], "2026-12-13": ["A"], "2026-12-18": ["A"] };
