/*
Data for dashboard 1 containing overall revenue for the entire 
hotel, bar as it's own revenue stream and bookings as their 
own revenue stream.
The data has be able to be filtered by season, month and by year for this data.
We technically only have data for 2025, but as more data is added
throughout the current year, the queries will create a realtime dashboard for the hotel.
*/

/*United data separated by year and month for hotel and bar*/
select 
    'Hotel' as source_type,
    extract(year from booking.arrival) as year,
    extract(month from booking.arrival) as month,
    sum(booking.price) as total_revenue
from booking
where booking.status = 'completed'
group by year, month

    union all

select
    'Bar' as source_type,
    extract(year from sales.date) as year,
    extract(month from sales.date) as month,
    sum(sales.quantity * product.unit_price) as total_revenue
from sales
join product on sales.product_id = product.id
group by year, month
order by year, month, source_type;


/*booking data separated by year and month*/
select
    season.name as season_name,
    extract(year from booking.arrival) as year,
    extract(month from booking.arrival) as month,
    sum(booking.price) as booking_revenue,
    count(booking.id) as total_bookings
from booking
join season on booking.season_id = season.id
group by season_name, year, month
order by year desc, booking_revenue desc;

/*bar data separated by year and month*/
select
    extract(year from sales.date) as year,
    extract(month from sales.date) as month,
    sum(sales.quantity * product.unit_price) as bar_revenue,
    count(sales.id) as total_sales
from sales
join product on sales.product_id = product.id
group by year, month
order by year desc, bar_revenue desc;



/*
Data for dashboard 2 containing booking revenue sorted by country, revenue pr. season 
sorted by country, booking data on which room types are most popular with which countries, 
which room types are most popular with which seasons and which countries book the longest
stays sorted by month and year. 
*/

/*revenue sorted by country*/
select
    country.name as country_name,
    count(booking.id) as total_bookings,
    sum(booking.price) as total_revenue
from booking
join costumer on booking.costumer_id = costumer.id
join country on costumer.country_id = country.id
where booking.status = 'completed'
group by country_name
order by total_revenue desc;

/*revenue pr. season sorted by country*/
select
    country.name as country_name,
    season.name as season_name,
    count(booking.id) as total_bookings,
    sum(booking.price) as total_revenue
from booking
join costumer on booking.costumer_id = costumer.id
join country on costumer.country_id = country.id
join season on booking.season_id = season.id
where booking.status = 'completed'
group by country_name, season_name
order by country_name, total_revenue desc;

/*room types most popular with countries*/
select
    country.name as country_name,
    room_type.name as room_type_name,
    count(booking.id) as total_bookings
from booking
join costumer on booking.costumer_id = costumer.id
join country on costumer.country_id = country.id
join room on booking.room_id = room.id
join room_type on room.room_type_id = room_type.id
group by country_name, room_type_name
order by country_name, total_bookings desc;

/*room types most popular with seasons*/
select
    season.name as season_name,
    room_type.name as room_type_name,
    count(booking.id) as total_bookings
from booking
join season on booking.season_id = season.id
join room on booking.room_id = room.id
join room_type on room.room_type_id = room_type.id
group by season_name, room_type_name
order by season_name, total_bookings desc;

/*countries booking longest stays sorted by month and year*/
select
    country.name as country_name,
    extract(year from booking.arrival) as year,
    extract(month from booking.arrival) as month,
    round(avg(extract(epoch from(booking.departure - booking.arrival)) / 86400), 1) as average_stay_length
    count(booking.id) as total_bookings
from booking
join costumer on booking.costumer_id = costumer.id
join country on costumer.country_id = country.id
where booking.status = 'completed'
group by country_name, year, month
order by year desc, month desc, average_stay_length desc;

/**/