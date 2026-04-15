-- Add raw time columns to time_slots for overlap detection and editing
alter table public.time_slots
  add column if not exists start_time time,
  add column if not exists end_time   time;

-- Backfill the seeded default rows so they have proper time data
update public.time_slots set start_time = '07:30', end_time = '08:30' where label = '7:30 AM - 8:30 AM';
update public.time_slots set start_time = '08:30', end_time = '09:30' where label = '8:30 AM - 9:30 AM';
update public.time_slots set start_time = '09:30', end_time = '10:30' where label = '9:30 AM - 10:30 AM';
update public.time_slots set start_time = '10:30', end_time = '11:30' where label = '10:30 AM - 11:30 AM';
update public.time_slots set start_time = '13:00', end_time = '14:00' where label = '1:00 PM - 2:00 PM';
update public.time_slots set start_time = '14:00', end_time = '15:00' where label = '2:00 PM - 3:00 PM';
update public.time_slots set start_time = '15:00', end_time = '16:00' where label = '3:00 PM - 4:00 PM';
