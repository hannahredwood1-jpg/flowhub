-- Run on deploy day, together with the release that labels the strategy "ECHO x ORBIT".
update "JournalEntry" set "setupType" = 'ECHO x ORBIT' where lower("setupType") = 'daily levels';
