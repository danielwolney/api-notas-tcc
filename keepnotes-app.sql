CREATE TABLE usuario (
    usuario TEXT,
    token TEXT
)

CREATE TABLE nota (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id TEXT DEFAULT "",
    texto TEXT,
    data_hora UNIXEPOCH DEFAULT strftime('%s','now')
)

SELECT id, texto, data_hora FROM nota WHERE resource_id IS EMPTY;

CREATE TABLE info_sync_nota (
    local_id INTEGER,
    resource_id TEXT,
    tipo_sync TEXT, --'update','delete
    CONSTRAINT PRIMARY KEY (local_id,resource_id)
)

--SELECT nota.id, nota.resource_id, nota.texto, nota.data_hora FROM nota WHERE JOIN info_sync_nota info ON nota.id = info.local_id WHERE tipo_sync = 'update';
CREATE TRIGGER sync_update AFTER UPDATE OF texto ON nota 
BEGIN
UPDATE nota SET data_hora = strftime('%s','now') WHERE id = OLD.id;
INSERT OR REPLACE INTO info_sync_nota (local_id, resource_id, tipo_sync) VALUES (OLD.id, OLD.resource_id, 'update');
END

CREATE TRIGGER sync_delete AFTER DELETE ON nota 
BEGIN
INSERT INTO info_sync_nota (local_id, resource_id, tipo_sync) VALUES (OLD.id, OLD.resource_id, 'delete');
END