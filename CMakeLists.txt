cmake_minimum_required(VERSION 3.0)

project(example)

set(EXEC_PATH ${CMAKE_CURRENT_BINARY_DIR}/bin)

set(EXECUTABLE_OUTPUT_PATH ${EXEC_PATH})

file (GLOB SRCS *.c)
add_executable(demo ${SRCS})

if(WIN32)
    target_link_libraries(demo ws2_32 advapi32)
endif()
