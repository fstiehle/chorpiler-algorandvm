#pragma version 10
#define TOKEN_STATE byte "s"
#define PAR_1 addr RFGEHKTFSLPIEGZYNVYALM6J4LJX4RPWERDWYS2PFKNVDWW3NG7MECQTJY
#define PAR_1 addr RFGEHKTFSLPIEGZYNVYALM6J4LJX4RPWERDWYS2PFKNVDWW3NG7MECQTJY
#define PAR_1 addr RFGEHKTFSLPIEGZYNVYALM6J4LJX4RPWERDWYS2PFKNVDWW3NG7MECQTJY
#define PAR_1 addr RFGEHKTFSLPIEGZYNVYALM6J4LJX4RPWERDWYS2PFKNVDWW3NG7MECQTJY
#define PAR_1 addr RFGEHKTFSLPIEGZYNVYALM6J4LJX4RPWERDWYS2PFKNVDWW3NG7MECQTJY

TOKEN_STATE
// S
TOKEN_STATE
// S, S
app_global_get // to debug: pop; int 1;
// S, global_tokenState
dup 
// S, global_tokenState, global_tokenState
int 0
// S, global_tokenState, global_tokenState, 0
==
// S, global_tokenState, Int
bnz init
// S, global_tokenState

main:
// TASK 1
// Check task is enabled
// S, global_tokenState
dup
dup
// S, global_tokenState, global_tokenState, global_tokenState
int 1
// S, global_tokenState, global_tokenState, global_tokenState, 1
&
// S, global_tokenState, global_tokenState, Int
==
// S, global_tokenState, Int
// Check participant is allowed
PAR_1 // TODO: Read TX Signer
// S, global_tokenState, Int, addr
PAR_1
// S, global_tokenState, Int, addr, addr
==
// S, global_tokenState, Int, Int
// Check previous conditions
&& 
// S, global_tokenState
bnz task_1

// Tasks
int 0
return

task_1:
int 1
// S, global_tokenState, 1
~
// S, global_tokenState, Int
&
// S, Int
int 2 
// S, Int, 2
|
// S, to_be_global_tokenState
b auto_loop

init:
// S, global_tokenState
pop
// S
int 1
// S, 1
app_global_put
// ...
int 1
// 1
return 

// Automatic transitions (need to be looped as more than one could fire)
auto_loop:
// S, to_be_global_tokenState
dup
// S, to_be_global_tokenState, to_be_global_tokenState
int 2
// S, to_be_global_tokenState, to_be_global_tokenState, 2
&
// S, to_be_global_tokenState, Int
bnz auto_2
// S, to_be_global_tokenState
app_global_put
int 1
return

auto_2:
int 2
// S, global_tokenState, 2
~
// S, global_tokenState, Int
&
// S, Int
int 4 
// S, Int, 4
|
// S, to_be_global_tokenState
b auto_loop