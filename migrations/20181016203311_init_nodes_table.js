
exports.up = function(knex, Promise) {
    return knex.raw('CREATE TABLE `nodes` (\n' +
        '       id int NOT NULL PRIMARY KEY AUTO_INCREMENT,\n' +
        '       public_key CHAR(100) NOT NULL UNIQUE,\n' +
        '       data json NOT NULL\n' +
        ') ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci');
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('nodes');
};
