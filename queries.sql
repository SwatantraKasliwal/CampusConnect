-- Admin table
create table adminlogin(
	id serial primary key,
	admin_id varchar(20) unique not null,
	password varchar(50) not null
);


INSERT INTO adminlogin (admin_id, password) VALUES ('user001', '12345678');

-- Event Table
CREATE TABLE event(
    event_id SERIAL PRIMARY KEY,
	event_name VARCHAR(250) NOT NULL,
	event_details VARCHAR(600),
	event_date DATE,
	user_id INT REFERENCES adminlogin(id)
);