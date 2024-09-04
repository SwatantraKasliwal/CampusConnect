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
	event_details VARCHAR(600),
	event_date DATE,
	user_id INT REFERENCES adminlogin(id),
	eventvenue VARCHAR(250),
	eventtime VARCHAR (20) NOT NULL
);
INSERT INTO event (event_name, event_details, event_date, user_id) 
VALUES ('demo2', 'this is demo 2 event', '2024-03-27', 1);