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
    round(avg(extract(epoch from(booking.departure - booking.arrival)) / 86400), 1) as average_stay_length,
    count(booking.id) as total_bookings
from booking
join costumer on booking.costumer_id = costumer.id
join country on costumer.country_id = country.id
where booking.status = 'completed'
group by country_name, year, month
order by year desc, month desc, average_stay_length desc;

/*
data for dashboard 3 containing overall revenue for each room type, room type revenue sorted
by season, which room type has the most bookings overall and which room type has the most bookings
sorted by season.
*/

/*overall revenue for each room type*/
select
    room_type.name as room_type_name,
    sum(booking.price) as total_revenue
from booking
join room on booking.room_id = room.id
join room_type on room.room_type_id = room_type.id
where booking.status = 'completed'
group by room_type_name
order by total_revenue desc;

/*room type revenue sorted by season*/
select
    season.name as season_name,
    room_type.name as room_type_name,
    count(booking.id) as total_bookings,
    sum(booking.price) as total_revenue
from booking
join room on booking.room_id = room.id
join room_type on room.room_type_id = room_type.id
join season on booking.season_id = season.id
where booking.status = 'completed'
group by season_name, room_type_name
order by season_name, total_revenue desc;

/*room type with the most bookings overall*/
select
    room_type.name as room_type_name,
    count(booking.id) as total_bookings
from booking
join room on booking.room_id = room.id
join room_type on room.room_type_id = room_type.id
group by room_type_name
order by total_bookings desc
limit 3;

/*room type with the most bookings sorted by season*/
with season_room_popularity as (
    select
        season.name as season_name,
        room_type.name as room_type_name,
        count(booking.id) as total_bookings,
        row_number() over (partition by season.name order by count(booking.id) desc) as rank
    from booking
    join room on booking.room_id = room.id
    join room_type on room.room_type_id = room_type.id
    join season on booking.season_id = season.id
    group by season_name, room_type_name
)

select
    season_name,
    room_type_name,
    total_bookings
from season_room_popularity
where rank <= 3
order by season_name;


/*
dashboard 4 containing overall revenue for the bar, which products produce the most revenue overall,
which product has been sold the most overall and an % of how much coffe and cocktails have been sold 
compared to each other.
*/

/*overall revenue for the bar*/
select
    sum(sales.quantity * product.unit_price) as total_revenue,
    sum(sales.quantity) as total_items_sold
from sales
join product on sales.product_id = product.id
order by total_revenue desc;

/*products that produce the most revenue overall*/
select
    product.name as product_name,
    sum(sales.quantity * product.unit_price) as total_revenue
from sales
join product on sales.product_id = product.id
group by product.name
order by total_revenue desc;

/*product sold the most overall*/
select
    product.name as product_name,
    sum(sales.quantity) as total_quantity_sold
from sales
join product on sales.product_id = product.id
group by product.name
order by total_quantity_sold desc;

/*% of coffee and cocktails sold compared to each other*/
with category_sales as (
    select
        category.name as category_name,
        sum(sales.quantity) as units_sold
    from sales
    join product on sales.product_id = product.id
    join category on product.category_id = category.id
    group by category.name
),
total_sales as (
    select sum(units_sold) as total_units_sold from category_sales
)
select
    category_name,
    units_sold,
    round((units_sold::numeric / total_units_sold) * 100, 2) as percentage_of_total_sales
from category_sales
cross join total_sales;
