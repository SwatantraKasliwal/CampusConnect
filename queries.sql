-- Admin table
create table adminlogin(
	id serial primary key,
	admin_id varchar(20) unique not null,
	password varchar(50) not null
);


INSERT INTO adminlogin (admin_id, password) VALUES ('user001', '12345678'),
('user002', '12345678')

-- Event Table
CREATE TABLE event(
    event_id SERIAL PRIMARY KEY,
	event_name VARCHAR(250) NOT NULL,
	event_details VARCHAR(600) NOT NULL,
	event_date DATE NOT NULL,
	user_id INT REFERENCES adminlogin(id) NOT NULL,
	event_venue VARCHAR(250) NOT NULL,
	event_time VARCHAR (20) NOT NULL,
	event_url VARCHAR (300) NOT NULL,
	event_banner VARCHAR (200) NOT NULL,
	banner_data BYTEA NOT NULL ,
);
INSERT INTO event (event_name, event_details, event_date, user_id, eventvenue, eventtime) 
VALUES ('demo1', 'this is demo 1 event', '2024-03-27', 1, "VPPCOE", "2 pm");

-- Student table 
CREATE TABLE studentlogin(
	id serial primary key,
	s_email varchar(70) not null ,
	s_password text not null
);