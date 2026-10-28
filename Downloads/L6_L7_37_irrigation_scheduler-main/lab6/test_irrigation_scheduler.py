import pytest
from irrigation_scheduler import should_irrigate, water_volume, schedule

#Example test cases:
def test_wet_soil_no_irrigation():
    assert should_irrigate(70, 0, "seedling") is False

def test_seedling_volume():
    assert water_volume(10, "seedling", 20) == 20

#Write the rest of the test cases so that the code is 90- 100% covered.
def test_seedling_needs_water():
    assert should_irrigate(30, 0, "seedling") is True


def test_flowering_boundary():
    assert should_irrigate(55, 0, "flowering") is False


def test_high_temperature():
    assert water_volume(10, "seedling", 40) == 30


def test_low_temperature():
    assert water_volume(10, "seedling", 5) == 10


def test_seedling_normal_temperature():
    assert water_volume(10, "seedling", 25) == 20


def test_flowering_normal_temperature():
    assert water_volume(10, "flowering", 25) == 50


def test_schedule_empty_zones():
    assert schedule([], 100) == []


def test_schedule_zero_budget():
    zones = [("ZoneA", 10, 30, 0, "seedling", 25)]
    assert schedule(zones, 0) == []

def test_heavy_rain_no_irrigation():
    assert should_irrigate(30, 10, "vegetative") is False


def test_seedling_soil_too_wet():
    assert should_irrigate(50, 0, "seedling") is False


def test_vegetative_moderate_rain():
    assert should_irrigate(30, 6, "vegetative") is False


def test_vegetative_moisture_high_enough():
    assert should_irrigate(45, 0, "vegetative") is False


def test_invalid_area():
    with pytest.raises(ValueError, match="invalid area"):
        water_volume(0, "seedling", 25)


def test_other_growth_stage():
    assert water_volume(10, "vegetative", 25) == 40


def test_schedule_skips_wet_zone():
    zones = [("ZoneA", 10, 60, 0, "seedling", 25)]
    assert schedule(zones, 100) == []


def test_schedule_success():
    zones = [("ZoneA", 10, 30, 0, "seedling", 25)]
    assert schedule(zones, 25) == ["ZoneA"]