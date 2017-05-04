/*
!!! Migrations have to be uniquely named. !!!
*/

<div data-name="create assets">
CREATE TABLE IF NOT EXISTS `assets` (
`uuid`  TEXT,
`address_uuid`  TEXT,
`id`    INTEGER,
`identifier`  TEXT,
`system_type` TEXT,
`name` TEXT,
`manufacturer` TEXT,
`model_number` TEXT ,
`serial_number` TEXT,
`heat_type` TEXT,
`voltage_type` TEXT,
`refrigerant_type` TEXT,
`other_refrigerant_type` TEXT,
`fresh_air` TEXT,
`filter_quantity` TEXT,
`filter_size` TEXT,
`belt` INTEGER,
`unit_condition` TEXT,
`recommendations` TEXT,
`latitude`  TEXT,
`longitude`  TEXT,
`coords_accuracy`  TEXT,
`created_at` TEXT,
`source`  TEXT DEFAULT 'mobile',
`sync` INTEGER NOT NULL DEFAULT 0,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create settings">
CREATE TABLE IF NOT EXISTS `settings` (
`id`  TEXT,
`value`  TEXT
);
</div>

<div data-name="create vehicles">
CREATE TABLE IF NOT EXISTS `vehicles` (
`id`  INTEGER,
`vehicle_number`  TEXT,
`plate`  TEXT,
`store_id`  INTEGER,
PRIMARY KEY(id)
);
</div>

<div data-name="create time_sheet_reasons">
CREATE TABLE IF NOT EXISTS `time_sheet_reasons` (
`id`  TEXT,
`name`  TEXT,
`description_required`  INTEGER DEFAULT 0,
`use_vehicle`  INTEGER DEFAULT 0,
`start_after_stop`  INTEGER DEFAULT 0,
`time_sheet_reason_type_id` INTEGER,
PRIMARY KEY(id)
);
</div>

<div data-name="create accounts">
CREATE TABLE IF NOT EXISTS `accounts` (
`uuid`  TEXT,
`tag`  TEXT,
`label`  TEXT,
`url`  TEXT,
`default_country_prefix`  TEXT,
`current`    INTEGER NOT NULL DEFAULT 0,
`token`  TEXT,
`phone`  TEXT,
`created_at`  TEXT,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create messages">
CREATE TABLE IF NOT EXISTS `messages` (
`uuid`  TEXT,
`person_id`    INTEGER,
`id`    INTEGER,
`sync`    INTEGER DEFAULT 0,
`completed`    INTEGER NOT NULL DEFAULT 0,
`hot`    INTEGER NOT NULL DEFAULT 0,
`subject`  TEXT,
`description`  TEXT,
`object_type` TEXT,
`object_uuid`	TEXT,
`created_at`  TEXT,
`completed_at`  TEXT ,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create addresses">
CREATE TABLE IF NOT EXISTS `addresses` (
`uuid`  TEXT,
`id`    INTEGER NOT NULL,
`address`   TEXT,
`address2`   TEXT,
`city`   TEXT,
`state`   TEXT,
`zip_code`   TEXT,
`gps_coords` TEXT,
`created_at` INTEGER,
`sync`  INTEGER NOT NULL DEFAULT 0,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create work_orders">
CREATE TABLE IF NOT EXISTS `work_orders` (
`uuid`	TEXT,
`id`	INTEGER NOT NULL,
`link_person_wo_id` INTEGER,
`work_order_id` INTEGER,
`sync`	INTEGER NOT NULL DEFAULT 0,
`work_order_number`	TEXT NOT NULL,
`address_uuid`	TEXT,
`confirmed_at`	TEXT,
`completed_at`	TEXT,
`store_number`	TEXT,
`current_time_sheet_reason` TEXT,
`client`	TEXT,
`phone`	TEXT,
`fax`	TEXT,
`received_date`	TEXT,
`expected_completion_date`	TEXT,
`status`	TEXT,
`priority`	TEXT,
`description`	BLOB,
`instruction`	BLOB,
`ivr_instructions`	BLOB,
`ivr_number`	TEXT,
`ivr_pin`	TEXT,
`tcg_ivr_pin` TEXT,
`ivr_from_store`	INTEGER DEFAULT 0,
`ivr_number_forward` TEXT,
`required_completion_code` INTEGER NOT NULL DEFAULT 0,
PRIMARY KEY(uuid)
);,
</div>

<div data-name="create work_order_assets">
CREATE TABLE IF NOT EXISTS `work_order_assets` (
`asset_uuid`	TEXT,
`work_order_uuid`	TEXT,
`created_at`	TEXT,
`work_requested`	TEXT,
`work_performed`	TEXT,
`link_asset_person_wo_id` TEXT
);
</div>

<div data-name="create gps_locations">
CREATE TABLE IF NOT EXISTS `gps_locations` (
`uuid`	TEXT,
`latitude`	NUMBER,
`longitude`	NUMBER,
`speed`	NUMBER,
`timestamp`	TEXT,
`sync`	INTEGER NOT NULL DEFAULT 0,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create time_sheets">
CREATE TABLE IF NOT EXISTS `time_sheets` (
`uuid`	TEXT,
`id`	INTEGER,
`type_id`	INTEGER NOT NULL,
`start_at`	TEXT,
`stop_at`	TEXT DEFAULT NULL,
`start_gps`	TEXT,
`stop_gps`	TEXT,
`description`	TEXT,
`object_type` TEXT,
`object_uuid`	TEXT,
`created_at`	TEXT,
`sync`	INTEGER DEFAULT 0,
`vehicle_id`	INTEGER,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create persons">
CREATE TABLE IF NOT EXISTS `persons` (
`uuid`	TEXT NOT NULL,
`id`	INTEGER,
`kind`	TEXT,
`type`	TEXT,
`first_name`	TEXT,
`last_name`	TEXT,
`created_at`	TEXT,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create sync_statuses">
create table if not exists `sync_statuses` (
`table_name` TEXT NOT NULL,
`last_sync_at` TEXT NOT NULL
);
</div>

<div data-name="create files">
CREATE TABLE IF NOT EXISTS `files` (
`uuid`	TEXT NOT NULL,
`id`	INTEGER,
`type` TEXT,
`filename` TEXT,
`gps_coords` TEXT,
`object_type` TEXT,
`object_uuid`	TEXT NOT NULL,
`created_at`	TEXT,
`sync`	INTEGER DEFAULT 0,
`type_id` INTEGER,
`object_id` INTEGER,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create time_sheet_types">
CREATE TABLE IF NOT EXISTS `time_sheet_types` (
`id`	INTEGER NOT NULL,
`reason_type_id` INTEGER NOT NULL,
`is_description_required` INTEGER NOT NULL,
`is_work_order_related` INTEGER NOT NULL,
`label`	TEXT NOT NULL,
PRIMARY KEY(id)
);
</div>

<div data-name="create items">
CREATE TABLE IF NOT EXISTS `items` (
`id`  INTEGER NOT NULL,
`type_id`  INTEGER,
`upc`  TEXT,
`number`  TEXT,
`description`  TEXT,
`company`  TEXT,
PRIMARY KEY(id)
);
</div>

<div data-name="create inventory">
CREATE TABLE IF NOT EXISTS `inventory` (
`id`  INTEGER NOT NULL,
`item_id`  INTEGER NOT NULL,
`qty`  INTEGER NOT NULL,
`updated_at`  TEXT,
PRIMARY KEY(id)
);
</div>

<div data-name="create quote_entries">
CREATE TABLE IF NOT EXISTS `quote_entries` (
`id`  INTEGER,
`uuid`  TEXT NOT NULL,
`quote_uuid`  TEXT NOT NULL,
`quote_id`  INTEGER,
`supplier_person_id` INTEGER,
`step_name`  TEXT,
`desc`  TEXT,
`subcontractor_name`  TEXT,
`subcontractor_phone`  TEXT,
`qty`	NUMBER,
`unit`  TEXT DEFAULT 'pcs',
`men`	INTEGER,
`hrs`	NUMBER,
`total`	NUMBER,
`price`	NUMBER,
`part_number`  TEXT,
`labor_rate_type_id` INTEGER,
`item_id` INTEGER,
`item_lead_time_type_id` INTEGER,
`trade_type_id` INTEGER,
`from_inventory` INTEGER DEFAULT 0,
`sync`	INTEGER DEFAULT 0,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create types">
CREATE TABLE IF NOT EXISTS `types` (
`id`  INTEGER NOT NULL,
`type`  TEXT NOT NULL,
`type_key`  TEXT NOT NULL,
`type_value`  TEXT,
PRIMARY KEY(id)
);
</div>

<div data-name="create quotes">
CREATE TABLE IF NOT EXISTS `quotes` (
`id`  INTEGER,
`table_name`  TEXT NOT NULL,
`uuid`  TEXT NOT NULL,
`asset_uuid`  TEXT,
`description`  TEXT DEFAULT '',
`status`  INTEGER,
`unit_down`  INTEGER,
`created_at`  TEXT NOT NULL,
`contact_name`  TEXT,
`contact_number`  TEXT,
`ready_at`  TEXT DEFAULT NULL,
`created_by`  TEXT,
`summary` TEXT,
`approved_at`  TEXT DEFAULT NULL,
`price_verified_by_supplier` INTEGER DEFAULT 0,
`sync`	INTEGER DEFAULT 0,
PRIMARY KEY(uuid)
);
</div>

<div data-name="create billing_entries">
CREATE TABLE IF NOT EXISTS `billing_entries` (
`id`  INTEGER,
`bill_id`  INTEGER,
`unit_down`  INTEGER,
`uuid`  TEXT NOT NULL,
`object_uuid`  TEXT NOT NULL,
`supplier_person_id` INTEGER,
`step_name`  TEXT,
`desc`  TEXT,
`subcontractor_name`  TEXT,
`subcontractor_phone`  TEXT,
`qty`	NUMBER,
`unit`  TEXT DEFAULT 'pcs',
`men`	INTEGER,
`hrs`	NUMBER,
`total`	NUMBER,
`price`	NUMBER,
`item_code`  TEXT,
`labor_rate_type_id` INTEGER,
`item_id` INTEGER,
`item_lead_time_type_id` INTEGER,
`trade_type_id` INTEGER,
`from_inventory` INTEGER DEFAULT 0,
`ready_at`  TEXT DEFAULT NULL,
`created_at`  TEXT,
`sync`	INTEGER DEFAULT 0,
PRIMARY KEY(uuid)
);
</div>

<div data-name="itemsDescriptionIndex"</div>CREATE INDEX IF NOT EXISTS index_items_description ON items (description);</div>
<div data-name="assetIdIndex"</div>CREATE INDEX IF NOT EXISTS index_asset_id ON assets (id);</div>
<div data-name="workOrderIndex"</div>CREATE INDEX IF NOT EXISTS index_work_order_id ON work_orders (work_order_id);</div>
<div data-name="workOrderIndex2"</div>CREATE INDEX IF NOT EXISTS index_work_order_link_person_wo_id ON work_orders (link_person_wo_id);</div>

<div data-name="create work_order_status_history">
CREATE TABLE IF NOT EXISTS `work_order_status_history` (
`id`  INTEGER,
`work_order_uuid`  TEXT NOT NULL,
`current_tech_status_type_id`  INTEGER,
`previous_tech_status_type_id`  INTEGER,
`created_at`  TEXT NOT NULL,
`sync`  INTEGER,
PRIMARY KEY(id)
);
</div>

<div data-name="add tech_status_type_id field to work_orders">
alter table work_orders add column tech_status_type_id INTEGER;
</div>

<div data-name="create tech_statuses">
CREATE TABLE IF NOT EXISTS `tech_statuses` (
`key`  TEXT,
`name`  TEXT,
`id` INTEGER,
`description_required`  INTEGER DEFAULT 0,
`use_vehicle`  INTEGER DEFAULT 0,
`start_after_stop`  INTEGER DEFAULT 0,
`time_sheet_reason_type_id` INTEGER,
PRIMARY KEY(key)
);
</div>

<div data-name="create belt size">
alter table assets add column `belt_size` TEXT;
</div>

<div data-name="add estimated_time to work_orders">
alter table work_orders add column `estimated_time` TEXT;
</div>

<div data-name="add scheduled_date to work_orders">
alter table work_orders add column `scheduled_date` TEXT;
</div>

<div data-name="add device token column">
alter table accounts add column `device_token` TEXT;
</div>

<div data-name="add message type column">
alter table messages add column `type` TEXT;
</div>

<div data-name="add work_orders canceled_at column">
alter table work_orders add column `canceled_at` TEXT;
</div>

<div data-name="add person_id column">
alter table accounts add column `person_id` INTEGER;
</div>

<div data-name="add username column">
alter table accounts add column `username` TEXT;
</div>

<div data-name="add creator_person_id to messsages">
alter table messages add column `creator_person_id` INTEGER;
</div>

<div data-name="add work_orders ivr_button_url column">
alter table work_orders add column `ivr_button_url` TEXT;
</div>

<div data-name="add work_orders ivr_button_label column">
alter table work_orders add column `ivr_button_label` TEXT;
</div>

<div data-name="add files description column">
alter table files add column `description` TEXT;
</div>

<div data-name="add read column to messsages">
alter table messages add column `read` INTEGER DEFAULT 0;
</div>

<div data-name="add work_orders tcg_ivr_tracking column">
alter table work_orders add column `tcg_ivr_tracking` TEXT;
</div>

<div data-name="add work_orders assigned_techs_vendors column">
alter table work_orders add column `assigned_techs_vendors` TEXT;
</div>

<div data-name="add work_orders primary_technician column">
alter table work_orders add column `primary_technician` INTEGER;
</div>

<div data-name="create surveys">
CREATE TABLE IF NOT EXISTS `surveys` (
`survey_instance_id`  INTEGER,
`survey_id`  INTEGER,
`name`  TEXT,
`table_name`  TEXT,
`record_id`  INTEGER,
`created_at`  TEXT NOT NULL,
`sync`  INTEGER,
PRIMARY KEY(survey_instance_id)
);
</div>

<div data-name="create survey-questions">
CREATE TABLE IF NOT EXISTS `survey_questions` (
`survey_question_id`  INTEGER,
`survey_id`  INTEGER,
`title`  TEXT,
`help_text`  TEXT,
`type`  TEXT,
`options`  TEXT,
`order_by`  TEXT,
`required`  INTEGER,
`created_at`  TEXT NOT NULL,
`sync`  INTEGER,
PRIMARY KEY(survey_question_id)
);
</div>

<div data-name="create survey-results">
CREATE TABLE IF NOT EXISTS `survey_results` (
`uuid`  TEXT,
`survey_result_id`  INTEGER,
`survey_instance_id`  INTEGER,
`survey_question_id`  INTEGER,
`answer`  TEXT,
`created_at`  TEXT NOT NULL,
`sync`  INTEGER,
PRIMARY KEY(uuid)
);
</div>

<div data-name="add link_person_wo_id to billing_entries">
alter table billing_entries add column `link_person_wo_id` INTEGER;
</div>

<div data-name="add record_id to quotes">
alter table quotes add column `record_id` INTEGER;
</div>

<div data-name="add link_person_wo_id to quotes">
alter table quotes add column `link_person_wo_id` INTEGER;
</div>

<div data-name="add uuid to work_order_assets 2016-03-18">
alter table work_order_assets add column `uuid` TEXT;
</div>

<div data-name="add files crc column">
    alter table files add column `crc` TEXT;
</div>

<div data-name="add read_at to messages">
alter table messages add column `read_at` TEXT;
</div>

<div data-name="woa wo_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS index_woa_work_order_uuid ON work_order_assets (work_order_uuid);</div>
<div data-name="woa asset_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS index_woa_asset_uuid ON work_order_assets (asset_uuid);</div>
<div data-name="files object_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS index_file_object_uuid ON files (object_uuid);</div>
<div data-name="messages object_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS messages_object_uuid ON messages (object_uuid);</div>
<div data-name="persons uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS persons_uuid ON persons (uuid);</div>
<div data-name="quote_entries uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS quote_entries_uuid ON quote_entries (uuid);</div>
<div data-name="quote_entries quote_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS quote_entries_quote_uuid ON quote_entries (quote_uuid);</div>
<div data-name="time_sheets object_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS time_sheets_object_uuid ON time_sheets (object_uuid);</div>
<div data-name="work_orders uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS work_orders_uuid ON work_orders (uuid);</div>
<div data-name="assets uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS assets_uuid ON assets (uuid);</div>
<div data-name="billing_entries uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS billing_entries_uuid ON billing_entries (uuid);</div>
<div data-name="billing_entries object_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS billing_entries_object_uuid ON billing_entries (object_uuid);</div>
<div data-name="quotes asset_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS quotes_asset_uuid ON quotes (asset_uuid);</div>
<div data-name="survey id index 2016-04-18">CREATE INDEX IF NOT EXISTS surveys_survey_id ON surveys (survey_id);</div>
<div data-name="survey_questions survey_id index 2016-04-18">CREATE INDEX IF NOT EXISTS survey_questions_survey_id ON survey_questions (survey_id);</div>
<div data-name="survey_results survey_result_id index 2016-04-18">CREATE INDEX IF NOT EXISTS survey_results_survey_result_id ON survey_results (survey_result_id);</div>
<div data-name="survey_results survey_instance_id index 2016-04-18">CREATE INDEX IF NOT EXISTS survey_results_survey_instance_id ON survey_results (survey_instance_id);</div>
<div data-name="survey_results survey_question_id index 2016-04-18">CREATE INDEX IF NOT EXISTS survey_results_survey_question_id ON survey_results (survey_question_id);</div>
<div data-name="work_orders tech_status_type_id index 2016-04-18">CREATE INDEX IF NOT EXISTS work_orders_tech_status ON work_orders (tech_status_type_id);</div>
<div data-name="work_orders status index 2016-04-18">CREATE INDEX IF NOT EXISTS work_orders_status ON work_orders (status);</div>
<div data-name="work_orders address_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS work_orders_address_uuid ON work_orders (address_uuid);</div>
<div data-name="assets address_uuid index 2016-04-18">CREATE INDEX IF NOT EXISTS assets_address_uuid ON assets (address_uuid);</div>

<div data-name="add quote_entries created_at column">
alter table quote_entries add column `created_at` TEXT;
</div>

<div data-name="add files thumbnail column">
alter table files add column `thumbnail` TEXT;
</div>

<div data-name="change api url 2016-04-30">
    update accounts set url = 'http://tcg2015.friendlycmms.com';
</div>

<div data-name="add accounts fallback_url column">
alter table accounts add column `fallback_url` TEXT;
</div>

<div data-name="add api fallback url 2016-05-02">
    update accounts set fallback_url = 'http://tcg2015.friendlycmms.com';
</div>

<div data-name="rename messages to messages_old 2016-05-02">
    ALTER TABLE messages RENAME TO messages_old;
</div>

<div data-name="create new messages table 2016-05-02">
CREATE TABLE IF NOT EXISTS `messages` (
`uuid`  TEXT,
`person_id`    INTEGER,
`id`    INTEGER,
`creator_person_id` INTEGER,
`sync`    INTEGER DEFAULT 0,
`completed`    INTEGER NOT NULL DEFAULT 0,
`hot`    INTEGER NOT NULL DEFAULT 0,
`subject`  TEXT,
`description`  TEXT,
`object_type` TEXT,
`object_uuid`	TEXT,
`created_at`  TEXT,
`completed_at`  TEXT ,
`type` TEXT,
PRIMARY KEY(uuid)
);
</div>

<div data-name="copy messages from messages_old to messages">
insert into messages (
  uuid,
  person_id,
  id,
  creator_person_id,
  sync,
  completed,
  hot,
  subject,
  description,
  object_type,
  object_uuid,
  created_at,
  completed_at,
  type
)
select
uuid,
person_id,
id,
creator_person_id,
sync,
completed,
hot,
subject,
description,
object_type,
object_uuid,
created_at,
completed_at,
type
from messages_old;
</div>

<div data-name="remove messages_old table">
drop table messages_old;
</div>

<div data-name="create persons id idx">
CREATE INDEX persons_idx ON persons(id);
</div>

<div data-name="create messages completd_at idx">
CREATE INDEX messages_done on messages(completed_at);
</div>

<div data-name="create settings_idx is on settings id">
CREATE INDEX settings_idx ON settings(id);
</div>

<div data-name="add status_type_id to assets">
alter table assets add column `status_type_id` INTEGER;
</div>

<div data-name="add created_at to work_orders">
alter table work_orders add column `created_at` TEXT;
</div>

<div data-name="add sync to work_order_assets">
alter table work_order_assets add column `sync` INTEGER DEFAULT 0;
</div>

<div data-name="set sync to 1 for work_order_assets with link_asset_person_wo_id">
update work_order_assets set sync = 1 where link_asset_person_wo_id is not null;
</div>

<div data-name="add updated_at to work_order_assets">
alter table work_order_assets add column `updated_at` TEXT;
</div>

<div data-name="add message work_order_number column">
alter table messages add column `work_order_number` TEXT;
</div>

<div data-name="add work_orders purchase_orders column">
alter table work_orders add column `purchase_orders` TEXT;
</div>

<div data-name="fix files for rodney 2016-06-10 1">
  update files set object_id = 6532 where object_uuid = '5eb49e05-e2c0-416a-89d9-de6ec3dcf84a' and sync = 0;
</div>

<div data-name="fix files for rodney 2016-06-10 2">
  update files set object_id = 19317 where object_uuid = '0dcae75b-4f5c-4388-895a-8c8115875a20'  and sync = 0;
</div>

<div data-name="fix files for kevin 2016-06-10 1">
  update files set object_id = 6532 where object_uuid = '5eb49e05-e2c0-416a-89d9-de6ec3dcf84a'  and sync = 0;
</div>

<div data-name="fix files for kevin 2016-06-10 2">
update files set object_id = 7068 where object_uuid = '58cfda4e-a13d-468a-8f8c-e10bffce9a0c' and sync = 0;
</div>

<div data-name="fix files for kevin 2016-06-10 3">
update files set object_id = 19317 where object_uuid = '0dcae75b-4f5c-4388-895a-8c8115875a20' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 2">
update files set object_id = 6492 where object_uuid = '2242966d-057f-441e-8e2f-02c6d797b140' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 3">
update files set object_id = 6530 where object_uuid =- '81bff115-6c01-4553-9c94-fb825b9b759d' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 4">
update files set object_id = 6884 where object_uuid = '1c968502-c95c-4f2f-8316-d6c560b4cef2' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 5">
update files set object_id = 6982 where object_uuid = '2f15a986-335b-4f84-84a4-bf28a8bff740' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 6">
update files set object_id = 6849 where object_uuid = '4d2a58dc-8e98-4ec0-a5b2-c4432f90cae9' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 7">
update files set object_id = 7102 where object_uuid = '752d9a61-6668-4477-8fa9-8bfc334e5cc9' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 8">
update files set object_id = 6633 where object_uuid = 'c74d16af-36df-482f-bad5-99515d5cc443' and sync = 0;
</div>

<div data-name="fix files for reif 2016-06-10 9">
update files set object_id = 7056 where object_uuid = 'f32979a1-4d22-4245-8caf-5a1d1d64358a' and sync = 0;
</div>

<div data-name="fix files for rafal p 2016-06-10">
update files set object_id = 19365 where object_uuid = '210b2713-5495-4bf1-8944-63e54ec81f94' and sync = 0;
</div>

<div data-name="fix files without object_uuid 2016-06-10">
update files set object_id = 15497, object_type='link_person_wo', description='to fix - ' || object_type where object_uuid is null or length(trim(object_uuid)) = 0;
</div>

<div data-name="add messages client_and_address column">
alter table messages add column `client_and_address` TEXT;
</div>

<div data-name="cast billing men field to int 2016-06-13">
update billing_entries set men = cast(men as int) where men is not null;
</div>

<div data-name="cast quotes men field to int 2016-06-13">
update quote_entries set men = cast(men as int) where men is not null;
</div>

<div data-name="add object_type to billing_entries">
alter table billing_entries add column `object_type` TEXT;
</div>

<div data-name="add assets_enabled field to work_orders">
alter table work_orders add column assets_enabled INTEGER DEFAULT 0;
</div>

<div data-name="add object_id field to messages">
alter table messages add column object_id INTEGER;
</div>

<div data-name="add size field to files">
alter table files add column size INTEGER;
</div>
