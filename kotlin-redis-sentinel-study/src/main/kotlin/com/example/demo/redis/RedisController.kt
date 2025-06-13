package com.example.demo.redis

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/redis")
class RedisController (
    private val redisService: RedisService
) {

    @PostMapping("/save")
    fun save(@RequestParam key: String, @RequestParam value: String): String {
        redisService.save(key, value);
        return "{ \"key\" : \"${key}\", \"value\" : \"${value}\"";
    }

    @GetMapping("/get")
    fun get(@RequestParam key: String): String? {
        return redisService.get(key);
    }

}