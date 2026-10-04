-- Run on deploy day, together with the release that labels the strategy "ECHO X ORBIT".
update "JournalEntry" set "setupType" = 'ECHO X ORBIT' where lower("setupType") = 'daily levels';
