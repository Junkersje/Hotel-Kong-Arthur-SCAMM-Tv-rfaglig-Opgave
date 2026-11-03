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
